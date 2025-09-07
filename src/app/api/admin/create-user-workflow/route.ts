import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      // Primary user data
      email,
      password,
      firstName,
      lastName,
      phone,
      
      // Facility data
      facilityId,
      facilityName,
      facilityAddress,
      facilityCity,
      facilityState,
      facilityZip,
      facilityPhone,
      facilityEmail,
      licenseNumber,
      cmsCertificationNumber,
      bedCount,
      facilityType,
      
      // Role data
      roleId,
      isPrimaryContact,
      
      // Additional staff
      additionalStaff
    } = body;

    const supa = supabaseService();
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results = {
      facility: null as any,
      primaryUser: null as any,
      additionalUsers: [] as any[],
      errors: [] as string[]
    };

    // Step 1: Create or get facility
    let facilityIdToUse = facilityId;
    
    if (!facilityId) {
      // Create new facility
      const { data: facility, error: facilityError } = await supa
        .from('facilities')
        .insert({
          name: facilityName,
          address: facilityAddress,
          city: facilityCity,
          state: facilityState,
          zip_code: facilityZip,
          phone: facilityPhone,
          email: facilityEmail,
          license_number: licenseNumber,
          cms_certification_number: cmsCertificationNumber,
          bed_count: bedCount || 0,
          facility_type: facilityType || 'skilled_nursing'
        })
        .select()
        .single();

      if (facilityError) {
        results.errors.push(`Failed to create facility: ${facilityError.message}`);
        return NextResponse.json({ ok: false, error: results.errors.join(', ') }, { status: 500 });
      }

      results.facility = facility;
      facilityIdToUse = facility.id;
    } else {
      // Get existing facility
      const { data: facility, error: facilityError } = await supa
        .from('facilities')
        .select('*')
        .eq('id', facilityId)
        .single();

      if (facilityError) {
        results.errors.push(`Failed to get facility: ${facilityError.message}`);
        return NextResponse.json({ ok: false, error: results.errors.join(', ') }, { status: 500 });
      }

      results.facility = facility;
    }

    // Step 2: Create primary user
    try {
      const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: 'user'
        }
      });

      if (authError) {
        results.errors.push(`Failed to create primary user: ${authError.message}`);
      } else {
        // Create profile
        const { data: profile, error: profileError } = await supa
          .from('profiles')
          .insert({
            user_id: authUser.user.id,
            email,
            full_name: `${firstName} ${lastName}`,
            role: 'user',
            facility_id: facilityIdToUse,
            facility_name: results.facility.name,
            facility_state: results.facility.state,
            phone: phone || null
          })
          .select()
          .single();

        if (profileError) {
          results.errors.push(`Failed to create primary user profile: ${profileError.message}`);
        } else {
          // Create facility assignment
          const { error: assignmentError } = await supa
            .from('user_facility_assignments')
            .insert({
              user_id: authUser.user.id,
              facility_id: facilityIdToUse,
              role_id: roleId,
              is_primary: isPrimaryContact,
              status: 'active'
            });

          if (assignmentError) {
            results.errors.push(`Failed to assign primary user to facility: ${assignmentError.message}`);
          }

          results.primaryUser = {
            ...profile,
            auth_user: authUser.user
          };
        }
      }
    } catch (error: any) {
      results.errors.push(`Primary user creation failed: ${error.message}`);
    }

    // Step 3: Create additional staff
    for (const staff of additionalStaff || []) {
      if (!staff.email || !staff.firstName || !staff.lastName) {
        results.errors.push(`Skipping staff member with incomplete information: ${staff.firstName} ${staff.lastName}`);
        continue;
      }

      try {
        // Generate a temporary password
        const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
        
        const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
          email: staff.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: staff.firstName,
            last_name: staff.lastName,
            role: 'user'
          }
        });

        if (authError) {
          results.errors.push(`Failed to create staff user ${staff.email}: ${authError.message}`);
          continue;
        }

        // Create profile
        const { data: profile, error: profileError } = await supa
          .from('profiles')
          .insert({
            user_id: authUser.user.id,
            email: staff.email,
            full_name: `${staff.firstName} ${staff.lastName}`,
            role: 'user',
            facility_id: facilityIdToUse,
            facility_name: results.facility.name,
            facility_state: results.facility.state,
            phone: staff.phone || null
          })
          .select()
          .single();

        if (profileError) {
          results.errors.push(`Failed to create staff profile for ${staff.email}: ${profileError.message}`);
          continue;
        }

        // Create facility assignment
        const { error: assignmentError } = await supa
          .from('user_facility_assignments')
          .insert({
            user_id: authUser.user.id,
            facility_id: facilityIdToUse,
            role_id: staff.roleId,
            is_primary: false,
            status: 'active'
          });

        if (assignmentError) {
          results.errors.push(`Failed to assign staff ${staff.email} to facility: ${assignmentError.message}`);
        }

        results.additionalUsers.push({
          ...profile,
          auth_user: authUser.user,
          temp_password: tempPassword
        });
      } catch (error: any) {
        results.errors.push(`Staff user creation failed for ${staff.email}: ${error.message}`);
      }
    }

    // Step 4: Send welcome emails (optional - can be implemented later)
    // TODO: Send welcome emails with login credentials

    return NextResponse.json({
      ok: true,
      message: `Successfully created ${1 + (additionalStaff?.length || 0)} user(s)`,
      facility: results.facility,
      primaryUser: results.primaryUser,
      additionalUsers: results.additionalUsers,
      errors: results.errors,
      users: [results.primaryUser, ...results.additionalUsers].filter(Boolean)
    });
  } catch (error: any) {
    console.error('User workflow creation error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
