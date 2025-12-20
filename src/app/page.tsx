"use client";

import { TextInput, Textarea, Select, Tooltip } from "@mantine/core";
import { useState } from "react";
import { ParticleBurst } from "@/components/ParticleBurst";
import { GlassProgressBar } from "@/components/GlassProgressBar";
import { AiButton } from "@/components/AiButton";
import { FogBackground } from "@/components/FogBackground";
import { RatingSlider } from "@/components/RatingSlider";
import { Card } from "@/components/Card";
import { GlowBadge } from "@/components/GlowBadge";
import { Button } from "@/components/Button";

export default function Home() {
  const [sliderValue, setSliderValue] = useState(3);
  const [selectValue, setSelectValue] = useState<string | null>(null);

  return (
    <>
      {/* Particle Burst Effect */}
      <ParticleBurst
        particleCount={8}
        desktopMinInterval={30000}
        desktopMaxInterval={45000}
        mobileMinInterval={200}
        mobileMaxInterval={400}
        speed={3}
        fadeDuration={1000}
      />

      {/* Animated Fog Background */}
      <FogBackground />

      <div className="min-h-screen p-8 md:p-12 max-w-7xl mx-auto relative z-10 flex flex-col gap-8">
        {/* Header */}
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            <span className="text-white">Prophe</span>
            <span className="text-highlight">zeiung</span>
          </h1>
          <nav className="flex gap-8">
            <a href="#" className="link-underline">Home</a>
            <a href="#" className="link-underline">Runden</a>
            <a href="#" className="link-underline">Profil</a>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="text-center flex flex-col gap-6">
          <GlowBadge size="md" withDot className="self-center">
            Design Demo
          </GlowBadge>
          <h2 className="text-4xl md:text-5xl font-bold">
            Prophezeie die Zukunft und{" "}
            <span className="gradient-text">lass andere bewerten</span>
          </h2>
          <p className="text-(--text-secondary) text-lg max-w-5xl mx-auto">
            Eine Sammlung von UI-Komponenten mit <span className="text-highlight">gespenstischem Glow</span> und
            eleganten Animationen für die Prophezeiung App.
          </p>
        </section>

        {/* Components Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto w-full">

          {/* Card Demo */}
          <Card>
            <Card.Title>Card Component</Card.Title>
            <p className="text-(--text-secondary) mb-4">
              Eine Karte mit subtiler Glasmorphismus-Optik und Hover-Effekt mit Glow.
            </p>
            <div className="flex gap-3">
              <GlowBadge>Tag 1</GlowBadge>
              <GlowBadge>Tag 2</GlowBadge>
            </div>
          </Card>

          {/* Input Demo */}
          <Card>
            <Card.Title>Input & Textarea</Card.Title>
            <div className="space-y-4">
              <TextInput
                placeholder="Text eingeben..."
              />
              <Textarea
                placeholder="Deine Prophezeiung..."
                rows={3}
              />
            </div>
          </Card>

          {/* Select Demo */}
          <Card>
            <Card.Title>Select</Card.Title>
            <Select
              placeholder="Runde auswählen..."
              value={selectValue}
              onChange={setSelectValue}
              data={[
                { value: "1", label: "Runde 2024 Q1" },
                { value: "2", label: "Runde 2024 Q2" },
                { value: "3", label: "Runde 2024 Q3" },
              ]}
            />
            <p className="text-(--text-muted) text-sm mt-3">
              Wähle eine Runde für deine Prophezeiung.
            </p>
          </Card>

          {/* Buttons Demo */}
          <Card>
            <Card.Title>Buttons</Card.Title>
            <div className="flex flex-wrap gap-4">
              <Button>Primary Button</Button>
              <Button variant="outline">Outline Button</Button>
            </div>
            <p className="text-(--text-muted) text-sm mt-4">
              Buttons mit Gradient und Glow-Effekt auf Hover.
            </p>
          </Card>

          {/* Tooltip Demo */}
          <Card>
            <Card.Title>Tooltip</Card.Title>
            <div className="flex gap-4 items-center">
              <Tooltip
                label="Dies ist ein Tooltip mit Glow-Effekt"
                position="top"
                withArrow
                classNames={{
                  tooltip: "tooltip-dark"
                }}
              >
                <Button variant="outline">Hover mich</Button>
              </Tooltip>
              <span className="text-(--text-secondary)">← Hover für Tooltip</span>
            </div>
          </Card>

          {/* Links Demo */}
          <Card>
            <Card.Title>Link Animation</Card.Title>
            <p className="text-(--text-secondary) mb-4">
              Links mit animierter Unterstreichung von links nach rechts:
            </p>
            <div className="flex flex-wrap gap-6">
              <a href="#" className="link-underline text-lg">Erster Link</a>
              <a href="#" className="link-underline text-lg">Zweiter Link</a>
              <a href="#" className="link-underline text-lg">Dritter Link</a>
            </div>
          </Card>

          {/* Text Styles Demo */}
          <Card colSpan={2}>
            <Card.Title>Text Styles</Card.Title>
            <div className="space-y-4">
              <p className="text-foreground">
                Primärer Text - <span className="text-highlight">hervorgehobener Text</span> - mit Glow-Effekt
              </p>
              <p className="text-(--text-secondary)">
                Sekundärer Text für Beschreibungen und weniger wichtige Informationen.
              </p>
              <p className="text-(--text-muted)">
                Gedämpfter Text für Hinweise und Meta-Informationen.
              </p>
              <p className="text-2xl font-bold">
                Text mit <span className="gradient-text">Gradient-Effekt</span> für besondere Hervorhebung.
              </p>
            </div>
          </Card>

          {/* Rating Slider Preview */}
          <Card colSpan={2} padding="p-4" className="max-w-md mx-auto w-full">
            <RatingSlider
              value={sliderValue}
              onChange={setSliderValue}
              label="Bewertung"
            />
          </Card>

          {/* Glass Progress Bar Demo */}
          <Card colSpan={2}>
            <Card.Title>Glass Progress Bar</Card.Title>
            <div className="flex flex-col gap-6">
              {/* Horizontal examples */}
              <div className="space-y-3">
                <p className="text-(--text-secondary) text-sm">Horizontal</p>
                <GlassProgressBar value={75} />
                <GlassProgressBar value={45} color="#14b8a6" />
                <GlassProgressBar value={25} color="#8b5cf6" thickness={16} />
              </div>
              {/* Vertical examples */}
              <div className="flex gap-6 items-end">
                <div className="text-center">
                  <GlassProgressBar value={80} orientation="vertical" length={120} />
                  <p className="text-(--text-muted) text-xs mt-2">80%</p>
                </div>
                <div className="text-center">
                  <GlassProgressBar value={55} orientation="vertical" length={120} color="#14b8a6" />
                  <p className="text-(--text-muted) text-xs mt-2">55%</p>
                </div>
                <div className="text-center">
                  <GlassProgressBar value={30} orientation="vertical" length={120} color="#a855f7" />
                  <p className="text-(--text-muted) text-xs mt-2">30%</p>
                </div>
              </div>
            </div>
          </Card>

          {/* AI Button Demo */}
          <Card colSpan={2}>
            <Card.Title>AI Button</Card.Title>
            <p className="text-(--text-secondary) mb-4">
              Button mit fließendem Gradient-Rand für KI-Aktionen.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <AiButton>KI Vorschlag</AiButton>
              <AiButton>Analysieren</AiButton>
              <AiButton disabled>Deaktiviert</AiButton>
            </div>
          </Card>

        </div>

        {/* Footer */}
        <footer className="text-center text-(--text-muted)">
          <p>Design inspiriert von <a href="https://chatyourdata.ai" className="link-underline text-(--text-secondary)" target="_blank" rel="noopener noreferrer">chatyourdata.ai</a></p>
        </footer>
      </div>
    </>
  );
}
