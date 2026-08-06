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
  label: string;
  image: string;
  description: string;
  preset: Pick<StudioSceneOptions, "width" | "depth" | "height">;
}>;

const products: readonly ProductDefinition[] = [
  {
    key: "pergola",
    name: "Pergola",
    label: "Outdoor room",
    image: "/assets/references/pergola.jpg",
    description: "A configurable aluminium structure for living outside.",
    preset: { width: 4.8, depth: 3.5, height: 2.4 },
  },
  {
    key: "pool",
    name: "Pool",
    label: "Water garden",
    image: "/assets/references/pool.jpg",
    description: "A clean-lined pool scene with terrace and planting.",
    preset: { width: 6.4, depth: 3.2, height: 1.45 },
  },
  {
    key: "garden",
    name: "Garden",
    label: "Landscape",
    image: "/assets/references/garden.jpg",
    description: "A planted garden layout ready for a spatial estimate.",
    preset: { width: 7.2, depth: 5.4, height: 2.2 },
  },
];

const frameNames: Record<FrameFinish, string> = {
  anthracite: "Anthracite",
  sand: "Sandstone",
  olive: "Olive grey",
};

const roofNames: Record<RoofType, string> = {
  louvers: "Adjustable louvers",
  glass: "Fixed glass roof",
};

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

function formatMoney(minor: string, currency: string) {
  return new Intl.NumberFormat("en-GB", {
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

  const product =
    products.find((item) => item.key === productKey) ?? products[0]!;

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
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
    camera.position.set(8.4, 5.6, 9.3);
    camera.lookAt(0, 1.1, 0);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0x000000, 0);
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
    camera.position.set(8.4, 5.6, 9.3);
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
          <span className="studio-live-dot" /> Direct 3D estimate
        </div>
        <a
          href="mailto:hello@ai-estimate.studio"
          className="studio-header-link"
        >
          Talk to the studio <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="studio-layout">
        <div
          className="studio-stage"
          style={
            { "--stage-image": `url(${product.image})` } as React.CSSProperties
          }
        >
          <div className="studio-reference-photo" aria-hidden="true" />
          <div className="studio-stage-shade" aria-hidden="true" />
          <div className="studio-canvas" ref={mountRef}>
            {!ready && (
              <div className="studio-loading">Preparing the model…</div>
            )}
          </div>
          <div className="studio-stage-title">
            <span>Reference / {product.name}</span>
            <strong>{product.label}</strong>
          </div>
          <div className="studio-stage-credit">
            Reference image · Unsplash / licensed for use
          </div>
          <div className="studio-tool-rail" aria-label="Viewer tools">
            <button
              className="studio-tool is-active"
              type="button"
              aria-label="Inspect object"
            >
              ◇
            </button>
            <button
              className={
                showMeasurements ? "studio-tool is-active" : "studio-tool"
              }
              type="button"
              onClick={() => setShowMeasurements((value) => !value)}
              aria-label="Toggle measurements"
            >
              ↔
            </button>
            <button
              className={autoRotate ? "studio-tool is-active" : "studio-tool"}
              type="button"
              onClick={() => setAutoRotate((value) => !value)}
              aria-label="Toggle auto orbit"
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
                <small>width</small>
              </span>
              <span>
                <b>{depth.toFixed(1)} m</b>
                <small>depth</small>
              </span>
              <span>
                <b>{height.toFixed(1)} m</b>
                <small>height</small>
              </span>
            </div>
          )}
          <div className="studio-stage-controls">
            <span>Drag to orbit</span>
            <span>Scroll to zoom</span>
            <button type="button" onClick={resetView}>
              Reset view <span aria-hidden="true">↺</span>
            </button>
          </div>
        </div>

        <aside className="studio-inspector">
          <div className="studio-inspector-head">
            <span className="studio-kicker">Garden room estimator</span>
            <span className="studio-ready">
              <i /> Ready
            </span>
          </div>
          <h1>
            {product.name}
            <br />
            <em>{product.label}</em>
          </h1>
          <p className="studio-intro">
            Shape the object in context. The estimate updates as the model
            changes.
          </p>

          <div
            className="studio-product-switcher"
            aria-label="Choose a product"
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
                  <strong>{item.name}</strong>
                  <small>{item.label}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="studio-total">
            <span>Estimated total</span>
            <strong>{formatMoney(pricing.totalMinor, pricing.currency)}</strong>
            <small>VAT included · indicative quote</small>
          </div>

          <section className="studio-section">
            <div className="studio-section-title">
              <strong>Dimensions</strong>
              <span>{(width * depth).toFixed(1)} m² footprint</span>
            </div>
            {(
              [
                ["Width (m)", width, setWidth, 2.4, 10],
                ["Depth (m)", depth, setDepth, 2.0, 8],
                ["Height (m)", height, setHeight, 1.4, 4],
              ] as const
            ).map(([label, value, setter, min, max]) => (
              <div className="studio-stepper" key={label}>
                <span>{label}</span>
                <div>
                  <button
                    type="button"
                    onClick={() => adjust(setter, value, -0.2, min, max)}
                    aria-label={`Decrease ${label}`}
                  >
                    −
                  </button>
                  <output>{value.toFixed(1)}</output>
                  <button
                    type="button"
                    onClick={() => adjust(setter, value, 0.2, min, max)}
                    aria-label={`Increase ${label}`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="studio-section studio-select-section">
            <label htmlFor="frame-finish">Frame colour</label>
            <select
              id="frame-finish"
              value={frame}
              onChange={(event) => {
                setFrame(event.target.value as FrameFinish);
                setQuoteRequested(false);
              }}
            >
              <option value="anthracite">● {frameNames.anthracite}</option>
              <option value="sand">● {frameNames.sand}</option>
              <option value="olive">● {frameNames.olive}</option>
            </select>
            {productKey === "pergola" && (
              <>
                <label htmlFor="roof-type">Roof</label>
                <select
                  id="roof-type"
                  value={roof}
                  onChange={(event) => {
                    setRoof(event.target.value as RoofType);
                    setQuoteRequested(false);
                  }}
                >
                  <option value="louvers">◌ {roofNames.louvers}</option>
                  <option value="glass">□ {roofNames.glass}</option>
                </select>
              </>
            )}
          </section>

          <section className="studio-section studio-addons">
            <div className="studio-section-title">
              <strong>Add-ons</strong>
              <span>Optional</span>
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
              <span>Integrated LED lighting</span>
              <b>{formatMoney("78000", "EUR")}</b>
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
              <span>Glass side screen</span>
              <b>{formatMoney("145000", "EUR")}</b>
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
              <span>Infrared heater</span>
              <b>{formatMoney("62000", "EUR")}</b>
            </label>
          </section>

          <section className="studio-breakdown">
            <div className="studio-section-title">
              <strong>Price breakdown</strong>
              <span>Live</span>
            </div>
            {pricing.lines
              .filter((line) => line.kind !== "TAX")
              .map((line) => (
                <div className="studio-breakdown-row" key={line.code}>
                  <span>{line.label}</span>
                  <b>{formatMoney(line.totalAmountMinor, pricing.currency)}</b>
                </div>
              ))}
            <div className="studio-breakdown-row studio-tax">
              <span>VAT 20%</span>
              <b>{formatMoney(pricing.taxMinor, pricing.currency)}</b>
            </div>
          </section>

          <button
            className={
              quoteRequested ? "studio-quote is-ready" : "studio-quote"
            }
            type="button"
            onClick={() => setQuoteRequested(true)}
          >
            {quoteRequested ? "Quote ready" : "Generate quote"}
            <span aria-hidden="true">↗</span>
          </button>
          {quoteRequested && (
            <p className="studio-quote-note" role="status">
              Your estimate is ready. The next step will attach customer details
              and a PDF quote.
            </p>
          )}
          <p className="studio-footnote">
            Reference assets are used to ground the generated scene. Final
            pricing is confirmed after site dimensions and delivery zone
            validation.
          </p>
        </aside>
      </section>
    </main>
  );
}
