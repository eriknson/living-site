import type { Metadata } from "next";
import { CountriesDashboard } from "@/components/countries-dashboard";
import countriesData from "@/data/countries.json";

export const metadata: Metadata = {
  title: "Biggest Countries – Erik Nilsson",
  description:
    "Dashboard of the largest countries by land area, population, and GDP",
};

export default function CountriesPage() {
  return <CountriesDashboard data={countriesData} />;
}
