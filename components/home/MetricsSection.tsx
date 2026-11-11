import {
  DatabaseLayersIcon,
  SatelliteRadarIcon,
  UsersIcon,
  CalendarIcon,
} from '@/components/home/HomeIcons';
import {
  getHomeMetrics,
  formatKm2,
  formatPercent,
  formatPeopleRounded,
  type HomeMetrics,
} from '@/lib/home-metrics';

interface MetricsSectionProps {
  metrics?: HomeMetrics;
}

export function MetricsSection({ metrics: propMetrics }: MetricsSectionProps) {
  const metrics = propMetrics || getHomeMetrics();
  const {
    readyCaseCount,
    sylhetExtentKm2,
    sylhetPercent,
    sensitivityMinKm2,
    sensitivityMaxKm2,
    exposureBaseline,
    exposureMin,
    exposureMax,
    nisarDateCount,
    nisarFirstMonth,
    nisarLastMonth,
  } = metrics;

  return (
    <section className="home-section" aria-labelledby="metrics-heading">
      {/* Section Header */}
      <div className="mb-8 md:mb-10 text-center flex flex-col items-center mx-auto">
        <h2
          id="metrics-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-headline font-semibold text-text-primary tracking-tight leading-snug text-center mx-auto"
        >
          The Project <span className="home-heading-accent">in Numbers</span>
        </h2>
        <p className="mt-2 text-sm sm:text-base text-text-secondary max-w-2xl text-center mx-auto leading-relaxed">
          Figures are read from the project&apos;s data files.
        </p>
      </div>

      {/* Row of 4 Large-Number Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {/* Card 1: Benchmark case studies */}
        <div className="home-metric justify-between">
          <div>
            <div className="mb-4 inline-flex items-center justify-center w-11 h-11 rounded-full bg-surface-2 border border-hairline text-teal">
              <DatabaseLayersIcon className="w-5 h-5" />
            </div>
            <div className="home-metric-number mb-2">{readyCaseCount}</div>
            <h3 className="text-base font-body font-semibold text-text-primary mb-2">
              Benchmark case studies
            </h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mt-2 pt-2 border-t border-hairline/40">
            Flood, river change, deforestation and surface water
          </p>
        </div>

        {/* Card 2: Sylhet 2022 flood extent */}
        <div className="home-metric justify-between">
          <div>
            <div className="mb-4 inline-flex items-center justify-center w-11 h-11 rounded-full bg-surface-2 border border-hairline text-teal">
              <SatelliteRadarIcon className="w-5 h-5" />
            </div>
            <div className="home-metric-number mb-2">{formatKm2(sylhetExtentKm2)} km²</div>
            <h3 className="text-base font-body font-semibold text-text-primary mb-2">
              Sylhet 2022 flood extent
            </h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mt-2 pt-2 border-t border-hairline/40">
            {formatPercent(sylhetPercent)}% of the study area at the default threshold. Tested range {formatKm2(sensitivityMinKm2)} to {formatKm2(sensitivityMaxKm2)} km².
          </p>
        </div>

        {/* Card 3: Estimated residents in that extent */}
        <div className="home-metric justify-between">
          <div>
            <div className="mb-4 inline-flex items-center justify-center w-11 h-11 rounded-full bg-surface-2 border border-hairline text-teal">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div className="home-metric-number mb-2">{formatPeopleRounded(exposureBaseline)}</div>
            <h3 className="text-base font-body font-semibold text-text-primary mb-2">
              Estimated residents in that extent
            </h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mt-2 pt-2 border-t border-hairline/40">
            WorldPop 2020 estimate. Range about {formatPeopleRounded(exposureMin, false)} to {formatPeopleRounded(exposureMax, false)} across thresholds.
          </p>
        </div>

        {/* Card 4: NISAR acquisition dates */}
        <div className="home-metric justify-between">
          <div>
            <div className="mb-4 inline-flex items-center justify-center w-11 h-11 rounded-full bg-surface-2 border border-hairline text-teal">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="home-metric-number mb-2">{nisarDateCount}</div>
            <h3 className="text-base font-body font-semibold text-text-primary mb-2">
              NISAR acquisition dates
            </h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mt-2 pt-2 border-t border-hairline/40">
            Hakaluki Haor, {nisarFirstMonth} to {nisarLastMonth}. Provisional data.
          </p>
        </div>
      </div>
    </section>
  );
}
