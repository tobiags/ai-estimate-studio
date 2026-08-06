"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  createStudioModel,
  type FrameFinish,
  type RoofType,
  type StudioProduct,
  type StudioSceneOptions,
} from "./scene-factory";

type ProductDefinition = Readonly<{
  key: StudioProduct;
  name: string;
  nameFr: string;
  label: string;
  labelFr: string;
  image: string;
  description: string;
  descriptionFr: string;
  preset: Pick<StudioSceneOptions, "width" | "depth" | "height">;
}>;

type Language = "en" | "fr";

const products: readonly ProductDefinition[] = [
  {
    key: "pergola",
    name: "Pergola",
    nameFr: "Pergola",
    label: "Outdoor room",
    labelFr: "Pièce extérieure",
    image: "/assets/references/pergola.jpg",
    description: "A configurable aluminium structure for living outside.",
    descriptionFr: "Une structure aluminium configurable pour vivre dehors.",
    preset: { width: 4.8, depth: 3.5, height: 2.4 },
  },
  {
    key: "pool",
    name: "Pool",
    nameFr: "Piscine",
    label: "Water garden",
    labelFr: "Jardin d'eau",
    image: "/assets/references/pool.jpg",
    description: "A clean-lined pool scene with terrace and planting.",
    descriptionFr:
      "Une piscine aux lignes nettes, avec terrasse et plantations.",
    preset: { width: 6.4, depth: 3.2, height: 1.45 },
  },
  {
    key: "garden",
    name: "Garden",
    nameFr: "Jardin",
    label: "Landscape",
    labelFr: "Paysage",
    image: "/assets/references/garden.jpg",
    description: "A planted garden layout ready for a spatial estimate.",
    descriptionFr: "Un aménagement végétal prêt pour une estimation spatiale.",
    preset: { width: 7.2, depth: 5.4, height: 2.2 },
  },
];

const frameNames: Record<FrameFinish, string> = {
  anthracite: "Anthracite",
  sand: "Sandstone",
  olive: "Olive grey",
};

const frameNamesFr: Record<FrameFinish, string> = {
  anthracite: "Anthracite",
  sand: "Sable",
  olive: "Gris olive",
};

const roofNames: Record<RoofType, string> = {
  louvers: "Adjustable louvers",
  glass: "Fixed glass roof",
};

const roofNamesFr: Record<RoofType, string> = {
  louvers: "Lames orientables",
  glass: "Toiture vitrée fixe",
};

const localized = {
  en: {
    directEstimate: "Direct 3D estimate",
    talkToStudio: "Talk to the studio",
    scene: "Scene",
    preparing: "Preparing the model…",
    viewerTools: "Viewer tools",
    inspect: "Inspect object",
    measurements: "Toggle measurements",
    autoOrbit: "Toggle auto orbit",
    width: "width",
    depth: "depth",
    height: "height",
    decrease: "Decrease",
    increase: "Increase",
    drag: "Drag to orbit",
    scroll: "Scroll to zoom",
    reset: "Reset view",
    estimator: "Garden room estimator",
    ready: "Ready",
    intro:
      "Shape the object in context. The estimate updates as the model changes.",
    chooseProduct: "Choose a product",
    estimatedTotal: "Estimated total",
    vatIncluded: "VAT included · indicative quote",
    dimensions: "Dimensions",
    footprint: "footprint",
    frameColour: "Frame colour",
    roof: "Roof",
    addons: "Add-ons",
    optional: "Optional",
    led: "Integrated LED lighting",
    glass: "Glass side screen",
    heater: "Infrared heater",
    priceBreakdown: "Price breakdown",
    live: "Live",
    vat: "VAT 20%",
    generateQuote: "Generate quote",
    quoteReady: "Quote ready",
    quoteNote:
      "Your estimate is ready. The next step will attach customer details and a PDF quote.",
    footnote:
      "Final pricing is confirmed after site dimensions and delivery zone validation.",
    language: "Language",
    reference: "3D scene",
    baseProduct: "Base product",
    dimensionArea: "Footprint",
    roofOption: "Roof option",
    labour: "Installation labour",
    delivery: "Delivery and site logistics",
    discount: "Large footprint discount",
  },
  fr: {
    directEstimate: "Estimation 3D directe",
    talkToStudio: "Parler au studio",
    scene: "Scène",
    preparing: "Préparation du modèle…",
    viewerTools: "Outils de visualisation",
    inspect: "Inspecter l'objet",
    measurements: "Afficher les mesures",
    autoOrbit: "Activer l'orbite automatique",
    width: "largeur",
    depth: "profondeur",
    height: "hauteur",
    decrease: "Diminuer",
    increase: "Augmenter",
    drag: "Glisser pour pivoter",
    scroll: "Défiler pour zoomer",
    reset: "Réinitialiser la vue",
    estimator: "Estimateur d'aménagement",
    ready: "Prêt",
    intro:
      "Modifiez l'objet dans son contexte. Le prix se met à jour avec le modèle.",
    chooseProduct: "Choisir un projet",
    estimatedTotal: "Total estimé",
    vatIncluded: "TVA incluse · devis indicatif",
    dimensions: "Dimensions",
    footprint: "emprise",
    frameColour: "Couleur de structure",
    roof: "Toiture",
    addons: "Options",
    optional: "Facultatif",
    led: "Éclairage LED intégré",
    glass: "Paroi vitrée latérale",
    heater: "Chauffage infrarouge",
    priceBreakdown: "Détail du prix",
    live: "En direct",
    vat: "TVA 20 %",
    generateQuote: "Générer le devis",
    quoteReady: "Devis prêt",
    quoteNote:
      "Votre estimation est prête. L'étape suivante ajoutera les coordonnées client et un devis PDF.",
    footnote:
      "Le prix final est confirmé après validation des dimensions et de la zone de livraison.",
    language: "Langue",
    reference: "Scène 3D",
    baseProduct: "Produit de base",
    dimensionArea: "Emprise",
    roofOption: "Option de toiture",
    labour: "Main-d'œuvre de pose",
    delivery: "Livraison et logistique de chantier",
    discount: "Remise grande emprise",
  },
} as const;

const uuid = (suffix: string) => `00000000-0000-4000-8000-0000000000${suffix}`;

function condition() {
  return { exists: { fact: "evaluationTimestamp" } } as const;
}

function makePriceRules(
  state: Readonly<{
    product: ProductDefinition;
    width: number;
    depth: number;
    height: number;
    glass: boolean;
    led: boolean;
    heater: boolean;
    roof: RoofType;
  }>,
) {
  const area = state.width * state.depth;
  const baseByProduct: Record<StudioProduct, number> = {
    pergola: 385000,
    pool: 215000,
    garden: 165000,
  };
  const areaRateByProduct: Record<StudioProduct, number> = {
    pergola: 42000,
    pool: 28500,
    garden: 16500,
  };
  const roofPrice = state.roof === "glass" ? 138000 : 0;
  const options = [
    state.glass
      ? { code: "OPT_GLASS", label: "Glass side screen", amount: 145000 }
      : null,
    state.led
      ? { code: "OPT_LED", label: "Integrated LED lighting", amount: 78000 }
      : null,
    state.heater
      ? { code: "OPT_HEATER", label: "Infrared heater", amount: 62000 }
      : null,
  ].filter(
    (item): item is { code: string; label: string; amount: number } =>
      item !== null,
  );

  return [
    {
      id: uuid("01"),
      code: "BASE_PRODUCT",
      kind: "BASE" as const,
      priority: 10,
      label: state.product.name,
      condition: condition(),
      exclusiveInGroup: false,
      action: {
        type: "ADD_LINE" as const,
        code: "BASE_PRODUCT",
        kind: "BASE" as const,
        label: state.product.name,
        amountMinor: String(baseByProduct[state.product.key]),
      },
    },
    {
      id: uuid("02"),
      code: "DIMENSION_AREA",
      kind: "DIMENSION" as const,
      priority: 20,
      label: `${area.toFixed(1)} m² footprint`,
      condition: condition(),
      exclusiveInGroup: false,
      action: {
        type: "ADD_LINE" as const,
        code: "DIMENSION_AREA",
        kind: "DIMENSION" as const,
        label: `${area.toFixed(1)} m² footprint`,
        amountMinor: String(
          Math.round(area * areaRateByProduct[state.product.key]),
        ),
      },
    },
    ...(roofPrice > 0
      ? [
          {
            id: uuid("03"),
            code: "OPT_ROOF",
            kind: "OPTION" as const,
            priority: 30,
            label: roofNames[state.roof],
            condition: condition(),
            exclusiveInGroup: false,
            action: {
              type: "ADD_LINE" as const,
              code: "OPT_ROOF",
              kind: "OPTION" as const,
              label: roofNames[state.roof],
              amountMinor: String(roofPrice),
            },
          },
        ]
      : []),
    ...options.map((option, index) => ({
      id: uuid(String(index + 4).padStart(2, "0")),
      code: option.code,
      kind: "OPTION" as const,
      priority: 40 + index,
      label: option.label,
      condition: condition(),
      exclusiveInGroup: false,
      action: {
        type: "ADD_LINE" as const,
        code: option.code,
        kind: "OPTION" as const,
        label: option.label,
        amountMinor: String(option.amount),
      },
    })),
    {
      id: uuid("08"),
      code: "LABOUR_INSTALL",
      kind: "LABOUR" as const,
      priority: 60,
      label: "Installation labour",
      condition: condition(),
      exclusiveInGroup: false,
      action: {
        type: "PERCENT" as const,
        basis: "SUBTOTAL" as const,
        rateBps: "1800",
        label: "Installation labour",
      },
    },
    {
      id: uuid("09"),
      code: "DELIVERY",
      kind: "DELIVERY" as const,
      priority: 70,
      label: "Delivery and site logistics",
      condition: condition(),
      exclusiveInGroup: false,
      action: {
        type: "PERCENT" as const,
        basis: "SUBTOTAL" as const,
        rateBps: "800",
        label: "Delivery and site logistics",
      },
    },
    ...(area >= 18
      ? [
          {
            id: uuid("10"),
            code: "VOLUME_DISCOUNT",
            kind: "DISCOUNT" as const,
            priority: 80,
            label: "Large footprint discount",
            condition: condition(),
            exclusiveInGroup: false,
            action: {
              type: "PERCENT" as const,
              basis: "SUBTOTAL" as const,
              rateBps: "-500",
              label: "Large footprint discount",
            },
          },
        ]
      : []),
    {
      id: uuid("11"),
      code: "VAT",
      kind: "TAX" as const,
      priority: 90,
      label: "VAT 20%",
      condition: condition(),
      exclusiveInGroup: false,
      action: {
        type: "PERCENT" as const,
        basis: "TAXABLE_SUBTOTAL" as const,
        rateBps: "2000",
        label: "VAT 20%",
      },
    },
  ];
}

type EstimateLine = Readonly<{
  code: string;
  kind:
    | "BASE"
    | "DIMENSION"
    | "OPTION"
    | "LABOUR"
    | "DELIVERY"
    | "DISCOUNT"
    | "TAX";
  label: string;
  totalAmountMinor: string;
}>;

type EstimateResult = Readonly<{
  currency: "EUR";
  totalMinor: string;
  taxMinor: string;
  lines: readonly EstimateLine[];
}>;

function evaluateLocalRules(
  rules: ReturnType<typeof makePriceRules>,
): EstimateResult {
  const lines: EstimateLine[] = [];
  for (const rule of rules) {
    const amount =
      rule.action.type === "ADD_LINE"
        ? Number(rule.action.amountMinor)
        : Math.round(
            (lines.reduce(
              (sum, line) => sum + Number(line.totalAmountMinor),
              0,
            ) *
              Number(rule.action.rateBps)) /
              10_000,
          );
    lines.push({
      code: rule.code,
      kind: rule.kind as EstimateLine["kind"],
      label: rule.label,
      totalAmountMinor: String(amount),
    });
  }
  const total = lines.reduce(
    (sum, line) => sum + Number(line.totalAmountMinor),
    0,
  );
  const tax = lines
    .filter((line) => line.kind === "TAX")
    .reduce((sum, line) => sum + Number(line.totalAmountMinor), 0);
  return {
    currency: "EUR",
    totalMinor: String(total),
    taxMinor: String(tax),
    lines,
  };
}

function formatMoney(
  minor: string,
  currency: string,
  language: Language = "en",
) {
  return new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(minor) / 100);
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((item) => item.dispose());
  });
}

function defaultCameraPosition(mount: HTMLDivElement | null) {
  const scale = (mount?.clientWidth ?? 1000) < 600 ? 1.35 : 1;
  return new THREE.Vector3(8.4 * scale, 5.6 * scale, 9.3 * scale);
}

export function StudioScreen() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const [ready, setReady] = useState(false);
  const [productKey, setProductKey] = useState<StudioProduct>("pergola");
  const [width, setWidth] = useState(4.8);
  const [depth, setDepth] = useState(3.5);
  const [height, setHeight] = useState(2.4);
  const [frame, setFrame] = useState<FrameFinish>("anthracite");
  const [roof, setRoof] = useState<RoofType>("louvers");
  const [glass, setGlass] = useState(true);
  const [led, setLed] = useState(true);
  const [heater, setHeater] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [quoteRequested, setQuoteRequested] = useState(false);
  const [language, setLanguage] = useState<Language>("en");

  const copy = localized[language];

  const product =
    products.find((item) => item.key === productKey) ?? products[0]!;
  const productName = language === "fr" ? product.nameFr : product.name;
  const productLabel = language === "fr" ? product.labelFr : product.label;

  const lineLabel = (line: EstimateLine) => {
    if (line.code === "BASE_PRODUCT") return productName;
    if (line.code === "DIMENSION_AREA") {
      return `${(width * depth).toFixed(1)} m² ${copy.footprint}`;
    }
    if (line.code === "OPT_ROOF") return copy.roofOption;
    if (line.code === "OPT_GLASS") return copy.glass;
    if (line.code === "OPT_LED") return copy.led;
    if (line.code === "OPT_HEATER") return copy.heater;
    if (line.code === "LABOUR_INSTALL") return copy.labour;
    if (line.code === "DELIVERY") return copy.delivery;
    if (line.code === "VOLUME_DISCOUNT") return copy.discount;
    return line.label;
  };

  const pricing = useMemo(() => {
    return evaluateLocalRules(
      makePriceRules({
        product,
        width,
        depth,
        height,
        glass,
        led,
        heater,
        roof,
      }),
    );
  }, [depth, glass, heater, height, led, product, roof, width]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e7e3da");
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
    camera.position.copy(defaultCameraPosition(mount));
    camera.lookAt(0, 1.1, 0);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0xe7e3da, 1);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight("#fffdf7", "#6c756a", 2.5);
    scene.add(ambient);
    const key = new THREE.DirectionalLight("#fff4dc", 4.4);
    key.position.set(-4, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#bed9d2", 1.5);
    fill.position.set(4, 3, -4);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 5.2;
    controls.maxDistance = 16;
    controls.minPolarAngle = Math.PI / 3.8;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.target.set(0, 1.1, 0);
    controls.autoRotateSpeed = 0.32;

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    controlsRef.current = controls;
    setReady(true);

    let frameId = 0;
    const render = () => {
      frameId = window.requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();
    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      if (modelRef.current) disposeObject(modelRef.current);
      mount.removeChild(renderer.domElement);
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      modelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!ready || !scene) return;
    if (modelRef.current) {
      scene.remove(modelRef.current);
      disposeObject(modelRef.current);
    }
    const options: StudioSceneOptions = {
      product: productKey,
      width,
      depth,
      height,
      frame,
      roof,
      glass,
      led,
      heater,
    };
    const model = createStudioModel(options);
    scene.add(model);
    modelRef.current = model;
  }, [
    depth,
    frame,
    glass,
    heater,
    height,
    led,
    productKey,
    ready,
    roof,
    width,
  ]);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  const resetView = () => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;
    camera.position.copy(defaultCameraPosition(mountRef.current));
    controls.target.set(0, 1.1, 0);
    controls.reset();
  };

  const changeProduct = (key: StudioProduct) => {
    const next = products.find((item) => item.key === key) ?? products[0]!;
    setProductKey(key);
    setWidth(next.preset.width);
    setDepth(next.preset.depth);
    setHeight(next.preset.height);
    setQuoteRequested(false);
  };

  const adjust = (
    setter: (value: number) => void,
    value: number,
    delta: number,
    min: number,
    max: number,
  ) => {
    setter(Number(Math.min(max, Math.max(min, value + delta)).toFixed(1)));
    setQuoteRequested(false);
  };

  return (
    <main className="studio-page">
      <header className="studio-header">
        <div className="studio-brand">
          <span className="studio-brand-mark">A</span>
          <span>AI Estimate Studio</span>
        </div>
        <div className="studio-header-state">
          <span className="studio-live-dot" /> {copy.directEstimate}
        </div>
        <div className="studio-header-actions">
          <div className="studio-language" aria-label={copy.language}>
            <button
              type="button"
              className={language === "en" ? "is-active" : ""}
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
            >
              EN
            </button>
            <button
              type="button"
              className={language === "fr" ? "is-active" : ""}
              onClick={() => setLanguage("fr")}
              aria-pressed={language === "fr"}
            >
              FR
            </button>
          </div>
          <a
            href="mailto:hello@ai-estimate.studio"
            className="studio-header-link"
          >
            {copy.talkToStudio} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <section className="studio-layout">
        <div className="studio-stage">
          <div className="studio-canvas" ref={mountRef}>
            {!ready && <div className="studio-loading">{copy.preparing}</div>}
          </div>
          <div className="studio-stage-title">
            <span>
              {copy.reference} / {productName}
            </span>
            <strong>{productLabel}</strong>
          </div>
          <div className="studio-tool-rail" aria-label={copy.viewerTools}>
            <button
              className="studio-tool is-active"
              type="button"
              aria-label={copy.inspect}
            >
              ◇
            </button>
            <button
              className={
                showMeasurements ? "studio-tool is-active" : "studio-tool"
              }
              type="button"
              onClick={() => setShowMeasurements((value) => !value)}
              aria-label={copy.measurements}
            >
              ↔
            </button>
            <button
              className={autoRotate ? "studio-tool is-active" : "studio-tool"}
              type="button"
              onClick={() => setAutoRotate((value) => !value)}
              aria-label={copy.autoOrbit}
            >
              ◌
            </button>
          </div>
          {showMeasurements && (
            <div
              className="studio-measurements"
              aria-label="Current dimensions"
            >
              <span>
                <b>{width.toFixed(1)} m</b>
                <small>{copy.width}</small>
              </span>
              <span>
                <b>{depth.toFixed(1)} m</b>
                <small>{copy.depth}</small>
              </span>
              <span>
                <b>{height.toFixed(1)} m</b>
                <small>{copy.height}</small>
              </span>
            </div>
          )}
          <div className="studio-stage-controls">
            <span>{copy.drag}</span>
            <span>{copy.scroll}</span>
            <button type="button" onClick={resetView}>
              {copy.reset} <span aria-hidden="true">↺</span>
            </button>
          </div>
        </div>

        <aside className="studio-inspector">
          <div className="studio-inspector-head">
            <span className="studio-kicker">{copy.estimator}</span>
            <span className="studio-ready">
              <i /> {copy.ready}
            </span>
          </div>
          <h1>
            {productName}
            <br />
            <em>{productLabel}</em>
          </h1>
          <p className="studio-intro">{copy.intro}</p>

          <div
            className="studio-product-switcher"
            aria-label={copy.chooseProduct}
          >
            {products.map((item) => (
              <button
                type="button"
                key={item.key}
                className={
                  item.key === productKey
                    ? "studio-product is-active"
                    : "studio-product"
                }
                onClick={() => changeProduct(item.key)}
              >
                <img src={item.image} alt="" />
                <span>
                  <strong>{language === "fr" ? item.nameFr : item.name}</strong>
                  <small>{language === "fr" ? item.labelFr : item.label}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="studio-total">
            <span>{copy.estimatedTotal}</span>
            <strong>
              {formatMoney(pricing.totalMinor, pricing.currency, language)}
            </strong>
            <small>{copy.vatIncluded}</small>
          </div>

          <section className="studio-section">
            <div className="studio-section-title">
              <strong>{copy.dimensions}</strong>
              <span>
                {(width * depth).toFixed(1)} m² {copy.footprint}
              </span>
            </div>
            {(
              [
                [
                  language === "fr" ? "Largeur (m)" : "Width (m)",
                  width,
                  setWidth,
                  2.4,
                  10,
                ],
                [
                  language === "fr" ? "Profondeur (m)" : "Depth (m)",
                  depth,
                  setDepth,
                  2.0,
                  8,
                ],
                [
                  language === "fr" ? "Hauteur (m)" : "Height (m)",
                  height,
                  setHeight,
                  1.4,
                  4,
                ],
              ] as const
            ).map(([label, value, setter, min, max]) => (
              <div className="studio-stepper" key={label}>
                <span>{label}</span>
                <div>
                  <button
                    type="button"
                    onClick={() => adjust(setter, value, -0.2, min, max)}
                    aria-label={`${copy.decrease} ${label}`}
                  >
                    −
                  </button>
                  <output>{value.toFixed(1)}</output>
                  <button
                    type="button"
                    onClick={() => adjust(setter, value, 0.2, min, max)}
                    aria-label={`${copy.increase} ${label}`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="studio-section studio-select-section">
            <label htmlFor="frame-finish">{copy.frameColour}</label>
            <select
              id="frame-finish"
              value={frame}
              onChange={(event) => {
                setFrame(event.target.value as FrameFinish);
                setQuoteRequested(false);
              }}
            >
              <option value="anthracite">
                ●{" "}
                {language === "fr"
                  ? frameNamesFr.anthracite
                  : frameNames.anthracite}
              </option>
              <option value="sand">
                ● {language === "fr" ? frameNamesFr.sand : frameNames.sand}
              </option>
              <option value="olive">
                ● {language === "fr" ? frameNamesFr.olive : frameNames.olive}
              </option>
            </select>
            {productKey === "pergola" && (
              <>
                <label htmlFor="roof-type">{copy.roof}</label>
                <select
                  id="roof-type"
                  value={roof}
                  onChange={(event) => {
                    setRoof(event.target.value as RoofType);
                    setQuoteRequested(false);
                  }}
                >
                  <option value="louvers">
                    ◌{" "}
                    {language === "fr"
                      ? roofNamesFr.louvers
                      : roofNames.louvers}
                  </option>
                  <option value="glass">
                    □ {language === "fr" ? roofNamesFr.glass : roofNames.glass}
                  </option>
                </select>
              </>
            )}
          </section>

          <section className="studio-section studio-addons">
            <div className="studio-section-title">
              <strong>{copy.addons}</strong>
              <span>{copy.optional}</span>
            </div>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={led}
                onChange={(event) => {
                  setLed(event.target.checked);
                  setQuoteRequested(false);
                }}
              />
              <span>{copy.led}</span>
              <b>{formatMoney("78000", "EUR", language)}</b>
            </label>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={glass}
                onChange={(event) => {
                  setGlass(event.target.checked);
                  setQuoteRequested(false);
                }}
              />
              <span>{copy.glass}</span>
              <b>{formatMoney("145000", "EUR", language)}</b>
            </label>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={heater}
                onChange={(event) => {
                  setHeater(event.target.checked);
                  setQuoteRequested(false);
                }}
              />
              <span>{copy.heater}</span>
              <b>{formatMoney("62000", "EUR", language)}</b>
            </label>
          </section>

          <section className="studio-breakdown">
            <div className="studio-section-title">
              <strong>{copy.priceBreakdown}</strong>
              <span>{copy.live}</span>
            </div>
            {pricing.lines
              .filter((line) => line.kind !== "TAX")
              .map((line) => (
                <div className="studio-breakdown-row" key={line.code}>
                  <span>{lineLabel(line)}</span>
                  <b>
                    {formatMoney(
                      line.totalAmountMinor,
                      pricing.currency,
                      language,
                    )}
                  </b>
                </div>
              ))}
            <div className="studio-breakdown-row studio-tax">
              <span>{copy.vat}</span>
              <b>{formatMoney(pricing.taxMinor, pricing.currency, language)}</b>
            </div>
          </section>

          <button
            className={
              quoteRequested ? "studio-quote is-ready" : "studio-quote"
            }
            type="button"
            onClick={() => setQuoteRequested(true)}
          >
            {quoteRequested ? copy.quoteReady : copy.generateQuote}
            <span aria-hidden="true">↗</span>
          </button>
          {quoteRequested && (
            <p className="studio-quote-note" role="status">
              {copy.quoteNote}
            </p>
          )}
          <p className="studio-footnote">{copy.footnote}</p>
        </aside>
      </section>
    </main>
  );
}
