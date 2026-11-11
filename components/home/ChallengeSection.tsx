import { WarningTriangleIcon, CheckCircleIcon } from '@/components/home/HomeIcons';
import { getHomeMetrics, type HomeMetrics } from '@/lib/home-metrics';

interface ChallengeSectionProps {
  metrics?: HomeMetrics;
}

export function ChallengeSection({ metrics: propMetrics }: ChallengeSectionProps) {
  const metrics = propMetrics || getHomeMetrics();
  const readyCaseCount = metrics.readyCaseCount;

  return (
    <section className="home-section" aria-labelledby="challenge-heading">
      {/* Section Header */}
      <div className="mb-8 md:mb-10 text-center flex flex-col items-center mx-auto">
        <h2
          id="challenge-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-headline font-semibold text-text-primary tracking-tight leading-snug text-center mx-auto"
        >
          The Challenge We&apos;re <span className="home-heading-accent">Solving</span>
        </h2>
        <p className="mt-2 text-sm sm:text-base text-text-secondary max-w-2xl text-center mx-auto leading-relaxed">
          Surface change is difficult to observe, measure and explain. Radar can observe it through cloud.
        </p>
      </div>

      {/* Two Columns Grid: stacks on mobile (<768px), 2 columns on tablet and desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* Left Column: Current challenges */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-hairline/60">
            <span
              className="inline-flex items-center justify-center p-1 rounded-full text-rust"
              style={{ color: 'var(--home-accent-warn)' }}
              aria-hidden="true"
            >
              <WarningTriangleIcon className="w-5 h-5 shrink-0" />
            </span>
            <h3 className="text-lg font-headline font-semibold text-text-primary">
              Current challenges
            </h3>
          </div>

          <div className="space-y-3.5">
            <div className="home-card home-card-warn">
              <h4 className="text-base font-body font-semibold text-text-primary mb-1.5">
                Clouds block optical imagery
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                During monsoon storms and smoke, optical satellites often cannot see the ground. Radar imaging works through cloud.
              </p>
            </div>

            <div className="home-card home-card-warn">
              <h4 className="text-base font-body font-semibold text-text-primary mb-1.5">
                Radar data is hard to use
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                Orbit tracks, large files and processing steps make raw SAR data difficult for non-specialists to work with.
              </p>
            </div>

            <div className="home-card home-card-warn">
              <h4 className="text-base font-body font-semibold text-text-primary mb-1.5">
                One number hides uncertainty
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                A single threshold gives a single area. The result can change when the threshold changes.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Our platform */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-hairline/60">
            <span
              className="inline-flex items-center justify-center p-1 rounded-full text-teal"
              style={{ color: 'var(--home-accent-green)' }}
              aria-hidden="true"
            >
              <CheckCircleIcon className="w-5 h-5 shrink-0" />
            </span>
            <h3 className="text-lg font-headline font-semibold text-text-primary">
              Our platform
            </h3>
          </div>

          <div className="space-y-3.5">
            <div className="home-card home-card-ok">
              <h4 className="text-base font-body font-semibold text-text-primary mb-1.5">
                Radar before and after
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                {readyCaseCount} precomputed case studies from Sentinel-1 C-band, and a time series from NASA-ISRO NISAR L-band data (provisional).
              </p>
            </div>

            <div className="home-card home-card-ok">
              <h4 className="text-base font-body font-semibold text-text-primary mb-1.5">
                Results with their uncertainty
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                Headline figures are shown with a tested threshold range and reliability notes computed from the data.
              </p>
            </div>

            <div className="home-card home-card-ok">
              <h4 className="text-base font-body font-semibold text-text-primary mb-1.5">
                Tools for non-specialists
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                Pick an area, list available acquisitions, export a ready Earth Engine script, and listen to the Chiku voice guide.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
