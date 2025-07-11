"use server";

import { createClient } from "@/utils/supabase/server";
import { AccountType } from "@/types/user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type ActionResponse = 
  | { error: string; success?: undefined; redirectTo?: undefined }
  | { success: boolean; redirectTo: string; error?: undefined };

export async function signInAction(state: { error: string | null }, formData: FormData): Promise<ActionResponse> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return {
      error: "Please provide both email and password",
    };
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return {
        error: signInError.message,
      };
    }

    if (!user) {
      return {
        error: "No user found",
      };
    }

    revalidatePath("/");
    return { success: true, redirectTo: "/" };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function signUpAction(state: { error: string | null }, formData: FormData): Promise<ActionResponse> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string || "user";
  const accountType = formData.get("accountType") as AccountType | null;

  if (!email || !password) {
    return {
      error: "Please provide both email and password",
    };
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
          account_type: accountType ?? 'External',
        },
      },
    });

    if (signUpError) {
      return {
        error: signUpError.message,
      };
    }

    if (!user) {
      return {
        error: "Failed to create user",
      };
    }

    if (accountType) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({ 
          user_id: user.id, 
          account_type: accountType,
          role: role
        });
      if (profileError) {
        console.error('Error inserting user profile:', profileError);
      }
    }

    revalidatePath("/");
    return { success: true, redirectTo: "/" };
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/auth");
}
