"use client";

import { useState } from "react";

import { Plus } from "@/components/ui/Icon";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  items: FAQItem[];
}

export function FAQSection({ items }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i));

  return (
    <section id="preguntas-frecuentes" className="py-20 transition-colors duration-300 dark:bg-surface-base">
      <div className="container mx-auto max-w-3xl px-6">
        <div className="mb-10 text-center">
          <span className="badge">Preguntas frecuentes</span>
          <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
            Todo lo que necesitás saber
          </h2>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            Respondemos las dudas más comunes antes de tu primera visita.
          </p>
        </div>
        <dl className="space-y-3">
          {items.map((item, i) => (
            <div
              key={item.question}
              className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 transition-colors duration-300 dark:border-surface-muted/60 dark:bg-surface-base/85"
            >
              <dt>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-sm font-semibold text-slate-900 dark:text-white"
                  aria-expanded={openIndex === i}
                  onClick={() => toggle(i)}
                >
                  <span>{item.question}</span>
                  <Plus
                    className={`h-5 w-5 flex-shrink-0 text-brand-teal transition-transform duration-200 dark:text-accent-cyan ${
                      openIndex === i ? "rotate-45" : ""
                    }`}
                    weight="bold"
                    aria-hidden="true"
                  />
                </button>
              </dt>
              {openIndex === i ? (
                <dd className="px-6 pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {item.answer}
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
