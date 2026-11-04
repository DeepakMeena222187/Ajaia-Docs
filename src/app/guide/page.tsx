import type { Metadata } from "next";
import Link from "next/link";
import { PlantArt } from "@/components/PlantArt";
import { listPlants } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Plant benefits guide",
  description: "What houseplants really do for your home and health, and which plants to pick for each benefit.",
};

const TOPICS = [
  {
    title: "Cleaner indoor air",
    art: "snake",
    hue: 120,
    text: "NASA's 1989 Clean Air Study found plants like snake plant, pothos and peace lily absorb pollutants such as benzene and formaldehyde in sealed chambers. In a real home the effect is modest, so pair plants with good ventilation — but every leaf helps.",
    filter: "air=1",
  },
  {
    title: "Better sleep",
    art: "succulent",
    hue: 120,
    text: "Snake plants and aloe use CAM photosynthesis and release oxygen at night, which makes them popular bedroom plants. Fragrant jasmine is also linked to calmer moods.",
    filter: "q=snake",
  },
  {
    title: "Natural humidity",
    art: "fern",
    hue: 105,
    text: "Plants release water vapour through their leaves. Ferns, areca palms and peace lilies can raise humidity in dry, air-conditioned rooms — kind on skin and sinuses.",
    filter: "q=palm",
  },
  {
    title: "Kitchen & wellness",
    art: "herb",
    hue: 115,
    text: "Tulsi, curry leaf, mint and lemongrass give you fresh leaves for kadha, tadka and chai every day, and aloe vera gel soothes minor burns.",
    filter: "category=Herbs+%26+Medicinal",
  },
  {
    title: "Safe for pets",
    art: "palm",
    hue: 110,
    text: "Cats and dogs nibble plants. Areca palm, Boston fern, spider plant and herbs like tulsi are non-toxic. Monstera, pothos, ZZ and snake plant should be kept out of reach.",
    filter: "petSafe=1",
  },
  {
    title: "Focus & mood",
    art: "monstera",
    hue: 150,
    text: "Studies of offices and classrooms link greenery to lower stress and better attention. Caring for a plant is also a small daily ritual that many people find grounding.",
    filter: "category=Indoor+Foliage",
  },
];

export default async function GuidePage() {
  const easy = (await listPlants({ difficulty: "Easy" })).slice(0, 6);

  return (
    <div className="container-page py-10">
      <p className="eyebrow">Learn</p>
      <h1 className="mt-2 max-w-3xl text-4xl font-semibold text-forest sm:text-5xl">What plants actually do for your home</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Honest, evidence-based benefits — and which plants deliver each one. Every plant page also lists its own benefits and care.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((t) => (
          <article key={t.title} className="card overflow-hidden">
            <div className="aspect-[16/9]">
              <PlantArt art={t.art} hue={t.hue} name={t.title} />
            </div>
            <div className="p-5">
              <h2 className="text-xl font-semibold text-forest">{t.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink">{t.text}</p>
              <Link href={`/plants?${t.filter}`} className="mt-3 inline-block text-sm font-semibold text-moss hover:underline">
                Shop these plants →
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-3xl font-semibold text-forest">Five rules that keep almost any plant alive</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Light first", "Match the plant to the light you have, not the other way round."],
            ["Water less", "Most houseplants die from overwatering. Check the soil before you pour."],
            ["Drainage", "Always use a pot with a hole. Roots sitting in water rot."],
            ["Feed lightly", "A diluted liquid feed once a month in spring and summer is plenty."],
            ["Watch leaves", "Yellow = too wet, crispy = too dry, pale = needs more light."],
          ].map(([title, text], i) => (
            <li key={title} className="card p-5">
              <span className="font-display text-3xl text-clay">{i + 1}</span>
              <h3 className="mt-1 font-semibold text-forest">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-semibold text-forest">Best plants for beginners</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {easy.map((p) => (
            <li key={p.id}>
              <Link href={`/plants/${p.slug}`} className="card flex items-center gap-3 p-3 hover:border-moss">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                  <PlantArt art={p.art} hue={p.hue} imageUrl={p.image_url} name={p.name} />
                </span>
                <span>
                  <span className="block font-semibold text-forest">{p.name}</span>
                  <span className="block text-xs text-muted">{p.benefits[0]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
