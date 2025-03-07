import React from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import MapView from "../components/MapView";
import ShipmentForm from "../components/ShipmentForm";
import FreterRequirements from "../components/FreterRequirements";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <h1>{t("welcome")}</h1>
      <button onClick={() => changeLanguage("en")}>English</button>
      <button onClick={() => changeLanguage("fr")}>French</button>

      <Hero />

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 -mt-20">
        <div className="space-y-12">
          <MapView />
          <div className="max-w-3xl mx-auto">
            <ShipmentForm />
          </div>
          <FreterRequirements />
        </div>
      </main>
    </div>
  );
}
