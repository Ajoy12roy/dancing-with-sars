import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — Dancing with the SARs',
  description:
    'About the team, challenge context, and open-source license for the Dancing with the SARs project.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-headline font-semibold text-(--color-text-primary)">
        About the Project
      </h1>
      <p className="mt-3 text-(--color-text-secondary) max-w-lg">
        Dancing with the SARs is an open-source tool built to detect and visualize environmental changes using Synthetic Aperture Radar (SAR) data.
      </p>

      <section className="mt-12 border-t border-(--color-hairline) pt-8">
        <h2 className="text-2xl font-headline font-semibold text-(--color-text-primary)">
          NASA Space Apps Challenge
        </h2>
        <p className="mt-3 text-(--color-text-secondary) max-w-3xl">
          This project was developed for the NASA International Space Apps Challenge. Our goal is to make SAR data accessible, interpretable, and actionable for monitoring deforestation, floods, and structural changes on the Earth's surface without relying on opaque machine learning models.
        </p>
      </section>

      <section className="mt-12 border-t border-(--color-hairline) pt-8">
        <h2 className="text-2xl font-headline font-semibold text-(--color-text-primary)">
          License
        </h2>
        <div className="mt-6 p-6 bg-(--color-paper-warm) border border-(--color-hairline) rounded-[2px] max-w-3xl">
          <h3 className="font-headline font-semibold text-(--color-text-primary)">
            Apache License 2.0
          </h3>
          <p className="mt-2 text-sm text-(--color-text-secondary)">
            This project is open-source and licensed under the Apache License 2.0, adhering to the default rules of the NASA Space Apps Challenge.
          </p>
          <div className="mt-5 text-xs text-(--color-text-caption) font-data p-4 bg-(--color-paper) border border-(--color-hairline) rounded-[2px] whitespace-pre-wrap">
{`Copyright 2026 Dancing with the SARs Team

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`}
          </div>
        </div>
      </section>
    </div>
  );
}
