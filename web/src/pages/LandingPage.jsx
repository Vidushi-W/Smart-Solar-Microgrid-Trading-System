import { useState } from "react";
import { Link } from "react-router-dom";
import SunMark from "../components/common/SunMark";

export default function LandingPage() {
  const [portrait, setPortrait] = useState("/landing.jfif");

  return (
    <main className="solar-landing">
      <section className="solar-hero" id="top">
        <header className="landing-nav">
          <Link to="/" className="wordmark wordmark-light" aria-label="Solar Grid home">
            <SunMark size={34} />
            <span>Solar<span>Grid</span></span>
          </Link>
          <nav aria-label="Main navigation">
            <a href="#network">Our network</a>
            <a href="#impact">Our impact</a>
            <a href="#about">About</a>
          </nav>
          <Link className="landing-login" to="/login">Sign in <span aria-hidden="true">↗</span></Link>
        </header>

        <div className="hero-copy">
          <p className="hero-overline"><span /> CLEAN POWER, SHARED LOCALLY</p>
          <h1>Powered<br />by the <em>sun.</em></h1>
          <p className="hero-quote">“Powered by the sun. Built for everyone.”</p>
          <p className="hero-description">A smarter way to connect solar energy, local storage and the people who keep communities moving.</p>
          <Link className="hero-cta" to="/login">Enter the operations portal <span aria-hidden="true">↗</span></Link>
          <div className="hero-footnote"><span>01 / 03</span><span>LOCAL ENERGY. REAL MOMENTUM.</span></div>
        </div>

        <div className="hero-portrait" aria-label="Solar energy network imagery">
          <img
            src={portrait}
            alt="Solar energy across a local microgrid"
            onError={() => setPortrait((current) => current === "/landing.jfif" ? "/login-solar.png" : current)}
          />
          <div className="portrait-stamp"><SunMark size={28} /><span>ENERGY<br />IN MOTION</span></div>
          <div className="portrait-caption"><span>01 — COMMUNITY GRID</span><strong>Bright ideas.<br />Shared power.</strong></div>
        </div>
        <div className="hero-edge-note">SRI LANKA · 6°55' N 79°51' E</div>
      </section>

      <section className="landing-ribbon" id="impact">
        <span>LOCAL GENERATION</span><i />
        <span>SHARED STORAGE</span><i />
        <span>CONNECTED COMMUNITIES</span><i />
        <span>POWERED BY THE SUN</span>
      </section>

      <section className="landing-intro" id="network">
        <div className="intro-kicker"><span>01</span><span>THE NETWORK</span></div>
        <div className="intro-main">
          <h2>Energy works<br />better <em>together.</em></h2>
          <div className="intro-aside">
            <p>SolarGrid brings microgrid stations, flexible energy slots and people into one clear operating picture.</p>
            <Link to="/login" className="text-link">Explore the platform <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="impact-row" id="about">
          <article><span>01 / GENERATE</span><h3>Catch the daylight.</h3><p>See station locations, energy capacity and operating hours in one place.</p></article>
          <article><span>02 / CONNECT</span><h3>Make power local.</h3><p>Coordinate operators, prosumers and the availability that links them.</p></article>
          <article><span>03 / MOVE</span><h3>Keep energy flowing.</h3><p>Manage accounts and the daily work behind a more resilient grid.</p></article>
        </div>
      </section>

      <footer className="landing-footer">
        <Link to="/" className="wordmark"><SunMark size={28} /><span>Solar<span>Grid</span></span></Link>
        <p>Powered by the sun. Shared by the community.</p>
        <Link to="/login">Operations sign in <span aria-hidden="true">↗</span></Link>
      </footer>
    </main>
  );
}