import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Problem from "./components/Problem";
import Solution from "./components/Solution";
import Showcase from "./components/Showcase";
import Features from "./components/Features";
import Modes from "./components/Modes";
import CTA from "./components/CTA";
import ScrollProgress from "./components/ScrollProgress";
import BackToTop from "./components/BackToTop";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <ScrollProgress />
      <Nav />
      <Hero />
      <Problem />
      <Solution />
      <Showcase />
      <Features />
      <Modes />
      <CTA />
      <BackToTop />
    </div>
  );
}
