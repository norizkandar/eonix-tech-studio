import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Unauthorized");

    const { replay_id } = await req.json();

    const { data: replay, error } = await supabase
      .from("class_replays")
      .select("id,class_id,storage_path,published")
      .eq("id", replay_id)
      .eq("published", true)
      .single();

    if (error || !replay) throw new Error("Replay unavailable");

    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("class_id", replay.class_id)
      .eq("student_id", userData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!enrollment) {
      const { data: teacherClass } = await supabase
        .from("classes")
        .select("teacher_id")
        .eq("id", replay.class_id)
        .single();

      if (teacherClass?.teacher_id !== userData.user.id) {
        throw new Error("You are not enrolled in this class");
      }
    }

    // The bucket is private. Generate a short-lived signed URL.
    const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!adminKey) throw new Error("Server storage key is not configured");

    const admin = createClient(url, adminKey);
    const { data, error: signError } = await admin.storage
      .from("class-replays")
      .createSignedUrl(replay.storage_path, 300);

    if (signError || !data?.signedUrl) throw new Error("Unable to create secure replay URL");

    return new Response(JSON.stringify({ signed_url: data.signedUrl }), {
      headers: {"Content-Type":"application/json"}
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 403,
      headers: {"Content-Type":"application/json"}
    });
  }
});
