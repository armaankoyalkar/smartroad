import { CirclePlus, Map as MapIcon } from "lucide-react";
import { loginRedirect } from "@/auth/redirects";
import { useAuth } from "@/auth/useAuth";
import { LinkButton } from "@/components/ui/Button";
import { PROJECT } from "@/constants/project";
import { RoadNetworkIllustration } from "./RoadNetworkIllustration";

/** Hero: wordmark, tagline, purpose, the two calls to action and the animated road network. */
export function Hero() {
  const { isAuthenticated } = useAuth();
  const reportTo = isAuthenticated ? "/app/report" : loginRedirect("/app/report");

  return (
    <section className="city-grid relative overflow-hidden" aria-labelledby="hero-title">
      <div className="glow-spot pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:py-28">
        <div className="max-w-xl animate-slide-up space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Final-year engineering project · Academic prototype
          </p>
          <h1
            id="hero-title"
            className="text-4xl font-semibold tracking-tight text-text sm:text-5xl lg:text-6xl"
          >
            Smart<span className="text-cyan-300">Road</span>
            <span className="mt-3 block text-2xl font-medium text-muted sm:text-3xl">
              Making Roads Smarter. Making Travel Safer.
            </span>
          </h1>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            SmartRoad is one place to report road incidents such as potholes, accidents, faulty signals and
            waterlogging, with a map location and a photo. Administrators verify each report, set its priority
            and track it to resolution, while everyone can see reported incidents on a map and administrators
            can study where reports cluster and estimate risk levels from historical data.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <LinkButton
              to={reportTo}
              size="lg"
              leftIcon={<CirclePlus className="h-5 w-5" aria-hidden="true" />}
            >
              Report an incident
            </LinkButton>
            <LinkButton
              to="/map"
              size="lg"
              variant="secondary"
              leftIcon={<MapIcon className="h-5 w-5" aria-hidden="true" />}
            >
              Explore the map
            </LinkButton>
          </div>
          <p className="text-xs text-faint">{PROJECT.academicNote}</p>
        </div>
        <div className="animate-fade-in">
          <RoadNetworkIllustration className="h-auto w-full rounded-3xl border border-navy-600 shadow-pop" />
        </div>
      </div>
    </section>
  );
}
