"use client";

import { useState } from "react";
import { useAdmin } from "../AdminContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";

export default function AdminLoginPage() {
  const { login } = useAdmin();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      toast.success("Connexion reussie");
      router.push("/admin");
    } else {
      toast.error("Identifiants incorrects");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1F44] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#071428] border-[#1a3a6e]">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-[#1a3a6e] rounded-lg flex items-center justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Administration</CardTitle>
          <CardDescription className="text-[#9CA3AF]">
            Connectez-vous pour acceder au back-office
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">Identifiant</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-[#122a52] border-[#1a3a6e] text-white placeholder:text-[#9CA3AF]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#122a52] border-[#1a3a6e] text-white placeholder:text-[#9CA3AF]"
              />
            </div>
            <Button type="submit" className="w-full bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
