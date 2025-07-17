import Link from "next/link"
import { TaleemLogo } from "@/components/taleem-logo"

export default function MarketingHome() {
  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-4 py-4 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-2">
          <TaleemLogo className="h-8 w-8 text-primary" />
          <span className="font-bold text-lg tracking-tight">Taleem</span>
        </div>
        <div className="hidden md:flex gap-6 items-center">
          <a href="#features" className="text-sm hover:text-primary transition-colors">Features</a>
          <a href="#mission" className="text-sm hover:text-primary transition-colors">Mission</a>
          <a href="#contact" className="text-sm hover:text-primary transition-colors">Contact</a>
        </div>
        <div className="flex gap-2">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-medium border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors">Log In</Link>
          <Link href="/signup" className="rounded-xl px-4 py-2 text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section with Glowing Effects */}
      <section className="relative flex flex-col items-center justify-center flex-1 px-4 py-20 sm:py-32 overflow-hidden min-h-[70vh]">
        {/* Glowing Background Effects */}
        <div className="absolute inset-0 -z-10">
          {/* Glowing Orbs */}
          <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-gradient-to-tr from-primary/40 via-purple-500/30 to-blue-400/30 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-gradient-to-br from-green-400/30 via-primary/30 to-blue-500/30 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-tl from-yellow-400/20 via-pink-500/20 to-primary/20 rounded-full blur-3xl opacity-70 animate-pulse-slowest" style={{ transform: 'translate(-50%, -50%)' }} />
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-background/70 dark:bg-background/80" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <TaleemLogo className="h-14 w-14 text-primary mb-2" />
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-center mb-2 drop-shadow-lg">The smart learning platform for Islamic schools.</h1>
          <div className="flex gap-4 flex-col sm:flex-row w-full sm:w-auto mt-4">
            <Link
              href="/signup"
              className="rounded-2xl px-8 py-3 bg-primary text-primary-foreground font-semibold text-lg shadow-lg hover:bg-primary/90 transition-colors text-center"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="rounded-2xl px-8 py-3 border border-border bg-background text-foreground font-semibold text-lg hover:bg-accent hover:text-accent-foreground transition-colors text-center"
            >
              Log In
            </Link>
          </div>
        </div>
        {/* Stats Bar */}
        <div className="absolute left-1/2 bottom-8 -translate-x-1/2 w-full max-w-3xl px-4 z-20">
          <div className="flex flex-col sm:flex-row justify-center gap-6 bg-background/80 dark:bg-background/90 rounded-2xl shadow-lg border border-border backdrop-blur-md py-4 px-6">
            <StatItem value="1000+" label="Students empowered" />
            <StatItem value="AI" label="Quran recitation feedback" />
            <StatItem value="3" label="Roles: Student, Teacher, Parent" />
            <StatItem value="Badges" label="Progress & achievements" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            title="AI-powered Quran Recitation Feedback"
            description="Receive instant, personalized feedback on Quran recitation accuracy using advanced AI."
            icon={<span role="img" aria-label="AI">🤖</span>}
          />
          <FeatureCard
            title="Personalized Student Dashboards"
            description="Students, teachers, and parents each get tailored dashboards to track progress and assignments."
            icon={<span role="img" aria-label="Dashboard">📊</span>}
          />
          <FeatureCard
            title="Multi-role Support"
            description="Seamless experience for Students, Teachers, and Parents—each with unique tools and views."
            icon={<span role="img" aria-label="Users">👨‍👩‍👧‍👦</span>}
          />
          <FeatureCard
            title="Progress Tracking & Badge System"
            description="Motivate students with progress tracking and achievement badges for learning milestones."
            icon={<span role="img" aria-label="Badge">🏅</span>}
          />
          <FeatureCard
            title="Class Communication Tools"
            description="Built-in tools for teachers, students, and parents to communicate and collaborate easily."
            icon={<span role="img" aria-label="Chat">💬</span>}
          />
          <FeatureCard
            title="Secure & Private"
            description="Your data is protected with modern security best practices and privacy controls."
            icon={<span role="img" aria-label="Lock">🔒</span>}
          />
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="max-w-3xl mx-auto px-4 py-16 sm:py-24">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-6">Our Mission</h2>
        <p className="text-lg text-center text-muted-foreground mb-6">
          Taleem was founded by students and educators to bridge Islamic values with modern technology. Our mission is to empower the next generation of learners with tools rooted in faith and excellence.
        </p>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-border py-8 px-4 bg-background/80 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <FooterLink href="#features">Features</FooterLink>
            <FooterLink href="#mission">Mission</FooterLink>
            <FooterLink href="#contact">Contact</FooterLink>
            <FooterLink href="#privacy">Privacy Policy</FooterLink>
            <FooterLink href="https://github.com/actual-taleem" target="_blank" rel="noopener noreferrer">GitHub</FooterLink>
            {/* Add Instagram/X links if available */}
          </div>
          <div className="text-sm text-muted-foreground text-center sm:text-right">
            © Taleem 2025
          </div>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 flex flex-col items-center text-center shadow-sm">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[100px]">
      <span className="text-xl font-bold text-primary drop-shadow">{value}</span>
      <span className="text-xs text-muted-foreground mt-1 text-center">{label}</span>
    </div>
  )
}

function FooterLink({ href, children, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      className="text-sm text-muted-foreground hover:text-primary transition-colors"
      {...props}
    >
      {children}
    </Link>
  )
}

// Custom slow pulse animations for glowing effects
// Add these to your global CSS if not present:
// .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
// .animate-pulse-slower { animation: pulse 7s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
// .animate-pulse-slowest { animation: pulse 12s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
