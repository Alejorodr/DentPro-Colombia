export const dynamic = "force-dynamic";

import InfoBar from "./components/InfoBar";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Specialists from "./components/Specialists";
import BookingForm from "./components/BookingForm";
import ContactSection from "./components/ContactSection";
import FloatingActions from "./components/FloatingActions";

export default function Home() {
  return (
    <>
      <InfoBar />
      <Navbar />
      <Hero />
      <Services />
      <Specialists />
      <BookingForm />
      <ContactSection />
      <footer className="container"><small className="muted">© <span id="year"></span> DentPro</small></footer>
      <FloatingActions />
    </>
  );
}
