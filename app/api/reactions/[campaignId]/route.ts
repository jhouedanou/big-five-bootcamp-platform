import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createBrowserClient } from "@/lib/supabase";

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

/**
 * GET /api/reactions/[campaignId]
 * Récupère les compteurs de réactions et la réaction de l'utilisateur connecté
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    // Compter les likes
    const { count: likes } = await supabaseAdmin
      .from("reactions")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("type", "like");

    // Compter les dislikes
    const { count: dislikes } = await supabaseAdmin
      .from("reactions")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("type", "dislike");

    // Vérifier la réaction de l'utilisateur connecté
    let userReaction: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: reaction } = await supabaseAdmin
          .from("reactions")
          .select("type")
          .eq("campaign_id", campaignId)
          .eq("user_id", user.id)
          .single();
        userReaction = reaction?.type || null;
      }
    }

    return NextResponse.json({
      likes: likes || 0,
      dislikes: dislikes || 0,
      userReaction,
    });
  } catch (error) {
    console.error("Erreur GET réactions:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reactions/[campaignId]
 * Toggle une réaction (like/dislike)
 * Body: { type: "like" | "dislike" }
 * - Si pas de réaction existante : crée la réaction
 * - Si même type : supprime la réaction (toggle off)
 * - Si type différent : met à jour la réaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    // Vérifier l'authentification
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type } = body;

    if (!type || !["like", "dislike"].includes(type)) {
      return NextResponse.json(
        { error: "Type de réaction invalide" },
        { status: 400 }
      );
    }

    // Vérifier s'il y a déjà une réaction
    const { data: existing } = await supabaseAdmin
      .from("reactions")
      .select("id, type")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .single();

    let action: "created" | "updated" | "removed";

    if (existing) {
      if (existing.type === type) {
        // Même type → supprimer (toggle off)
        await supabaseAdmin
          .from("reactions")
          .delete()
          .eq("id", existing.id);
        action = "removed";
      } else {
        // Type différent → mettre à jour
        await supabaseAdmin
          .from("reactions")
          .update({ type, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        action = "updated";
      }
    } else {
      // Pas de réaction → créer
      const { error: insertError } = await supabaseAdmin
        .from("reactions")
        .insert({
          user_id: user.id,
          campaign_id: campaignId,
          type,
        });

      if (insertError) {
        console.error("Erreur insert réaction:", insertError);
        return NextResponse.json(
          { error: "Erreur lors de l'enregistrement" },
          { status: 500 }
        );
      }
      action = "created";
    }

    // Récupérer les compteurs mis à jour
    const { count: likes } = await supabaseAdmin
      .from("reactions")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("type", "like");

    const { count: dislikes } = await supabaseAdmin
      .from("reactions")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("type", "dislike");

    const userReaction = action === "removed" ? null : type;

    return NextResponse.json({
      action,
      likes: likes || 0,
      dislikes: dislikes || 0,
      userReaction,
    });
  } catch (error) {
    console.error("Erreur POST réaction:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
