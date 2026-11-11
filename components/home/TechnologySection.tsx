import {
  SatelliteRadarIcon,
  DatabaseLayersIcon,
  UsersIcon,
  MapPinIcon,
  BarChartIcon,
  WaveformSpeakerIcon,
} from '@/components/home/HomeIcons';
import { getHomeMetrics, type HomeMetrics } from '@/lib/home-metrics';

interface TechnologySectionProps {
  metrics?: HomeMetrics;
}

export function TechnologySection({ metrics: propMetrics }: TechnologySectionProps) {
  const metrics = propMetrics || getHomeMetrics();
  const {
    nisarDateCount,
    nisarFlaggedCount,
    nisarFirstMonth,
    nisarLastMonth,
  } = metrics;

  const flaggedText =
    nisarFlaggedCount === 1
      ? '1 date is flagged by a rule declared in advance.'
      : `${nisarFlaggedCount} dates are flagged by a rule declared in advance.`;

  return (
    <section className="home-section" aria-labelledby="tech-heading">
      {/* Section Header */}
      <div className="mb-8 md:mb-10 text-left">
        <h2
          id="tech-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-headline font-semibold text-text-primary tracking-tight leading-snug"
        >
          Powered by <span className="home-heading-accent">Open Radar Data</span>
        </h2>
        <p className="mt-2 text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed">
          Sentinel-1, NISAR and population data, processed with documented and tested methods.
        </p>
      </div>

      {/* Grid of 6 Cards: 1 col on mobile, 2 on sm, 3 on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {/* Card 1: Sentinel-1 case studies (green) */}
        <div className="home-card home-card-green flex flex-col justify-between">
          <div>
            <div className="mb-3.5">
              <span className="home-badge home-badge-green">
                <SatelliteRadarIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Sentinel-1</span>
              </span>
            </div>
            <h3 className="text-base font-body font-semibold text-text-primary mb-2">
              Sentinel-1 case studies
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Flood, river change, deforestation and surface water cases, each with a threshold sensitivity class.
            </p>
          </div>
        </div>

        {/* Card 2: NISAR L-band time series (blue) */}
        <div className="home-card home-card-blue flex flex-col justify-between">
          <div>
            <div className="mb-3.5">
              <span className="home-badge home-badge-blue">
                <DatabaseLayersIcon className="w-3.5 h-3.5 shrink-0" />
                <span>NISAR L-band</span>
              </span>
            </div>
            <h3 className="text-base font-body font-semibold text-text-primary mb-2">
              NISAR L-band time series
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {nisarDateCount} acquisition dates over Hakaluki Haor, {nisarFirstMonth} to {nisarLastMonth}. {flaggedText} The data are provisional.
            </p>
          </div>
        </div>

        {/* Card 3: Exposure estimate (orange) */}
        <div className="home-card home-card-orange flex flex-col justify-between">
          <div>
            <div className="mb-3.5">
              <span className="home-badge home-badge-orange">
                <UsersIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Demographics</span>
              </span>
            </div>
            <h3 className="text-base font-body font-semibold text-text-primary mb-2">
              Exposure estimate
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              The Sylhet 2022 flood extent combined with the WorldPop 2020 population grid. An estimate, not a count of affected people.
            </p>
          </div>
        </div>

        {/* Card 4: Area picker and export script (green) */}
        <div className="home-card home-card-green flex flex-col justify-between">
          <div>
            <div className="mb-3.5">
              <span className="home-badge home-badge-green">
                <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Custom AOI</span>
              </span>
            </div>
            <h3 className="text-base font-body font-semibold text-text-primary mb-2">
              Area picker and export script
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              The NASA ASF catalogue lists Sentinel-1 and NISAR acquisitions for a chosen area. The generated Earth Engine script uses one orbit geometry for both dates.
            </p>
          </div>
        </div>

        {/* Card 5: Sensitivity and reliability notes (blue) */}
        <div className="home-card home-card-blue flex flex-col justify-between">
          <div>
            <div className="mb-3.5">
              <span className="home-badge home-badge-blue">
                <BarChartIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Uncertainty</span>
              </span>
            </div>
            <h3 className="text-base font-body font-semibold text-text-primary mb-2">
              Sensitivity and reliability notes
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Results are tested across a threshold range. Notes are computed from the data and are not written by AI.
            </p>
          </div>
        </div>

        {/* Card 6: Chiku voice guide (orange) */}
        <div className="home-card home-card-orange flex flex-col justify-between">
          <div>
            <div className="mb-3.5">
              <span className="home-badge home-badge-orange">
                <WaveformSpeakerIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Accessibility</span>
              </span>
            </div>
            <h3 className="text-base font-body font-semibold text-text-primary mb-2">
              Chiku voice guide
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Reads results aloud with the browser&apos;s speech synthesis. The text is always shown, and the page works with a keyboard and screen readers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
