/**
 * API Route: POST /api/license/upload-certificate
 * 
 * Upload du certificat d'achat Chariow (PDF/image) vers Supabase Storage.
 * Le certificat est stocké et l'URL est sauvegardée dans les metadata du paiement.
 * 
 * Body: multipart/form-data
 * - file: Le fichier certificat (PDF, JPG, PNG)
 * - email: Email de l'utilisateur
 * - licenseKey: (optionnel) Clé de licence associée
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'certificates';

async function ensureBucketExists(supabaseAdmin: any) {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b: any) => b.name === BUCKET_NAME);

  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: false, // Les certificats ne sont PAS publics
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
      ],
    });
    if (error && !error.message.includes('already exists')) {
      console.error('Error creating certificates bucket:', error);
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const email = formData.get('email') as string | null;
    const licenseKey = formData.get('licenseKey') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Vérifier le type MIME
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: `Type de fichier non supporté: ${file.type}. Acceptés : PDF, JPG, PNG, WebP`,
      }, { status: 400 });
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 });
    }

    // Client admin Supabase
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // S'assurer que le bucket existe
    await ensureBucketExists(supabaseAdmin);

    // Générer un nom de fichier unique
    const ext = file.name.split('.').pop() || 'pdf';
    const timestamp = Date.now();
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${safeEmail}/${timestamp}-certificate.${ext}`;

    // Convertir en buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload vers Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Certificate upload error:', error);
      return NextResponse.json({ error: `Erreur upload: ${error.message}` }, { status: 500 });
    }

    // Générer une URL signée (valide 7 jours) pour accès admin
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 7 * 24 * 60 * 60);

    const certificateUrl = signedUrlData?.signedUrl || data.path;

    console.log('📄 Certificate uploaded:', { email, path: data.path, licenseKey });

    // Sauvegarder l'URL du certificat dans la table payments (si paiement existe)
    if (licenseKey) {
      const { data: payments } = await supabaseAdmin
        .from('payments')
        .select('id, metadata')
        .contains('metadata', { license_key: licenseKey })
        .limit(1);

      if (payments && payments.length > 0) {
        const payment = payments[0];
        const updatedMetadata = {
          ...(payment.metadata || {}),
          certificate_path: data.path,
          certificate_uploaded_at: new Date().toISOString(),
        };
        await supabaseAdmin
          .from('payments')
          .update({ metadata: updatedMetadata })
          .eq('id', payment.id);
      }
    }

    // Aussi sauvegarder dans le profil utilisateur
    await supabaseAdmin
      .from('users')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('email', email);

    return NextResponse.json({
      success: true,
      path: data.path,
      signedUrl: certificateUrl,
      message: 'Certificat uploadé avec succès',
    });
  } catch (error: any) {
    console.error('Certificate upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
