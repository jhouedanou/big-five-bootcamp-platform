import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Mail, MapPin, Phone, Send } from "lucide-react"

export default function ContactPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1">
                <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-[#D0E4F2] to-white">
                    {/* Abstract wave background */}
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br from-[#80368D]/30 via-transparent to-transparent rounded-full blur-3xl transform rotate-12 scale-150" />
                    </div>

                    <div className="container relative mx-auto px-4 text-center">
                        <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-6 text-[#1A1F2B]">
                            On discute ?
                        </h1>
                        <p className="text-lg text-[#1A1F2B]/70 max-w-2xl mx-auto">
                            Une question sur nos offres ? Besoin d'une démo personnalisée ? Notre équipe est là pour vous aider à décoller.
                        </p>
                    </div>
                </section>

                <section className="py-20 -mt-20 relative z-10">
                    <div className="container mx-auto px-4">
                        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {/* Contact Info Cards */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="p-6 rounded-2xl bg-card border border-border shadow-xl">
                                    <h3 className="font-bold text-xl mb-6">Nos Coordonnées</h3>
                                    <div className="space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Email</p>
                                                <p className="text-sm text-muted-foreground">hello@bigfiveCreative Library.com</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <MapPin className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Bureau</p>
                                                <p className="text-sm text-muted-foreground">Abidjan, Côte d'Ivoire<br />Cocody Rivera 3</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <Phone className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Téléphone</p>
                                                <p className="text-sm text-muted-foreground">+225 07 00 00 00 00</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Form */}
                            <div className="lg:col-span-2">
                                <div className="p-8 rounded-2xl bg-card border border-border shadow-xl">
                                    <h3 className="font-bold text-xl mb-6">Envoyez-nous un message</h3>
                                    <form className="space-y-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Prénom</label>
                                                <input type="text" className="w-full h-12 rounded-lg border border-input bg-background px-3 focus:ring-2 focus:ring-primary/20 transition-all outline-none" placeholder="Jean" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Nom</label>
                                                <input type="text" className="w-full h-12 rounded-lg border border-input bg-background px-3 focus:ring-2 focus:ring-primary/20 transition-all outline-none" placeholder="Kouassi" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Email professionnel</label>
                                            <input type="email" className="w-full h-12 rounded-lg border border-input bg-background px-3 focus:ring-2 focus:ring-primary/20 transition-all outline-none" placeholder="jean@agence.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Message</label>
                                            <textarea className="w-full min-h-[150px] rounded-lg border border-input bg-background p-3 focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-y" placeholder="Comment pouvons-nous vous aider ?" />
                                        </div>
                                        <Button className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25">
                                            Envoyer le message
                                            <Send className="ml-2 h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    )
}
