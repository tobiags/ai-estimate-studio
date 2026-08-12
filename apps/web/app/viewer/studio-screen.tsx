"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type DragEvent,
} from "react";
import {
  attachAccessory,
  defaultStudioConfiguration,
  insertWall,
  moveWall,
  removeAccessory,
  removeWall,
  usedWidthMm,
  type StudioConfiguration,
} from "@ai-estimate-studio/domain";
import { evaluateStudioEstimate } from "@ai-estimate-studio/pricing-engine";
import {
  defaultStudioCatalog,
  isStudioAccessoryCode,
  isStudioBaseCode,
  isStudioWallCode,
  rebuildStudioConfiguration,
  studioLabel,
  studioModulePriceMinor,
  studioCatalog,
  type StudioLanguage,
} from "../studio/catalog";
import { getStudioCopy } from "../studio/i18n";
import { loadStudioState, saveStudioState } from "../studio/persistence";
import { createStudioEstimatePdf } from "../studio/estimate-pdf";
import { StudioViewer } from "./studio-viewer";

type StudioState = Readonly<{
  configuration: StudioConfiguration;
  language: StudioLanguage;
  showAnalysis: boolean;
  resetSignal: number;
  hydrated: boolean;
  webglReady: boolean | null;
  notice: string | null;
}>;

type StudioAction =
  | Readonly<{
      type: "HYDRATE";
      configuration: StudioConfiguration;
      language: StudioLanguage;
    }>
  | Readonly<{ type: "SET_LANGUAGE"; language: StudioLanguage }>
  | Readonly<{ type: "SET_ANALYSIS"; visible: boolean }>
  | Readonly<{ type: "SET_WEBGL"; ready: boolean }>
  | Readonly<{ type: "RESET_VIEW" }>
  | Readonly<{ type: "NOTICE"; message: string | null }>
  | Readonly<{ type: "BASE"; code: string }>
  | Readonly<{ type: "ADD_WALL"; code: string }>
  | Readonly<{ type: "MOVE_WALL"; wallId: string; index: number }>
  | Readonly<{ type: "REMOVE_WALL"; wallId: string }>
  | Readonly<{
      type: "ADD_ACCESSORY";
      code: string;
      targetWallId: string | null;
    }>
  | Readonly<{ type: "REMOVE_ACCESSORY"; accessoryId: string }>;

const initialState: StudioState = {
  configuration: defaultStudioConfiguration,
  language: "en",
  showAnalysis: false,
  resetSignal: 0,
  hydrated: false,
  webglReady: null,
  notice: null,
};

function withConfiguration(
  state: StudioState,
  configuration: StudioConfiguration,
): StudioState {
  return { ...state, configuration, notice: null };
}

function failureMessage(
  reason: "WIDTH_EXCEEDED" | "UNKNOWN_MODULE" | "INVALID_TARGET",
  copy: ReturnType<typeof getStudioCopy>,
): string {
  if (reason === "WIDTH_EXCEEDED") return copy.incompatible;
  if (reason === "INVALID_TARGET") return copy.noWall;
  return copy.incompatible;
}

function reducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        configuration: action.configuration,
        language: action.language,
        hydrated: true,
      };
    case "SET_LANGUAGE":
      return { ...state, language: action.language, notice: null };
    case "SET_ANALYSIS":
      return { ...state, showAnalysis: action.visible };
    case "SET_WEBGL":
      return { ...state, webglReady: action.ready };
    case "RESET_VIEW":
      return { ...state, resetSignal: state.resetSignal + 1 };
    case "NOTICE":
      return { ...state, notice: action.message };
    case "BASE": {
      if (!isStudioBaseCode(action.code)) return state;
      const rebuilt = rebuildStudioConfiguration(
        action.code,
        state.configuration.walls,
        state.configuration.accessories,
      );
      return rebuilt
        ? withConfiguration(state, rebuilt)
        : { ...state, notice: getStudioCopy(state.language).incompatible };
    }
    case "ADD_WALL": {
      if (!isStudioWallCode(action.code)) return state;
      const result = insertWall(
        state.configuration,
        action.code,
        state.configuration.walls.length,
        defaultStudioCatalog,
      );
      return result.ok
        ? withConfiguration(state, result.configuration)
        : {
            ...state,
            notice: failureMessage(
              result.reason,
              getStudioCopy(state.language),
            ),
          };
    }
    case "MOVE_WALL": {
      const result = moveWall(state.configuration, action.wallId, action.index);
      return result.ok
        ? withConfiguration(state, result.configuration)
        : {
            ...state,
            notice: failureMessage(
              result.reason,
              getStudioCopy(state.language),
            ),
          };
    }
    case "REMOVE_WALL": {
      const result = removeWall(state.configuration, action.wallId);
      return result.ok
        ? withConfiguration(state, result.configuration)
        : {
            ...state,
            notice: failureMessage(
              result.reason,
              getStudioCopy(state.language),
            ),
          };
    }
    case "ADD_ACCESSORY": {
      if (!isStudioAccessoryCode(action.code) || !action.targetWallId) {
        return { ...state, notice: getStudioCopy(state.language).noWall };
      }
      const result = attachAccessory(
        state.configuration,
        action.code,
        action.targetWallId,
        defaultStudioCatalog,
      );
      return result.ok
        ? withConfiguration(state, result.configuration)
        : {
            ...state,
            notice: failureMessage(
              result.reason,
              getStudioCopy(state.language),
            ),
          };
    }
    case "REMOVE_ACCESSORY": {
      const result = removeAccessory(state.configuration, action.accessoryId);
      return result.ok
        ? withConfiguration(state, result.configuration)
        : {
            ...state,
            notice: failureMessage(
              result.reason,
              getStudioCopy(state.language),
            ),
          };
    }
  }
}

function formatMoney(minor: string | number, language: StudioLanguage): string {
  return new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(minor) / 100);
}

function formatMeters(millimetres: number): string {
  return `${(millimetres / 1000).toFixed(2).replace(".", ",")} m`;
}

function modulePriceLabel(code: string, language: StudioLanguage): string {
  return formatMoney(studioModulePriceMinor(code as never), language);
}

function dragCode(event: DragEvent<HTMLElement>): string | undefined {
  const code = event.dataTransfer.getData("application/x-mobup-module");
  return code || undefined;
}

export function StudioScreen() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(
    defaultStudioConfiguration.walls[0]?.id ?? null,
  );
  const [projectName, setProjectName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pdfStatus, setPdfStatus] = useState<
    "idle" | "busy" | "ready" | "error"
  >("idle");
  const copy = getStudioCopy(state.language);
  const handleViewerReady = useCallback(
    (ready: boolean) => dispatch({ type: "SET_WEBGL", ready }),
    [],
  );
  const handleViewerError = useCallback(
    (message: string) => dispatch({ type: "NOTICE", message }),
    [],
  );

  useEffect(() => {
    const restored = loadStudioState(
      typeof window === "undefined" ? undefined : window.localStorage,
    );
    dispatch({
      type: "HYDRATE",
      configuration: restored.configuration,
      language: restored.language,
    });
    setSelectedWallId(restored.configuration.walls[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    saveStudioState(
      typeof window === "undefined" ? undefined : window.localStorage,
      {
        catalogVersion: state.configuration.catalogVersion,
        language: state.language,
        configuration: state.configuration,
      },
    );
  }, [state.configuration, state.hydrated, state.language]);

  useEffect(() => {
    if (
      selectedWallId &&
      state.configuration.walls.some((wall) => wall.id === selectedWallId)
    ) {
      return;
    }
    setSelectedWallId(state.configuration.walls[0]?.id ?? null);
  }, [selectedWallId, state.configuration.walls]);

  const estimate = useMemo(
    () =>
      evaluateStudioEstimate({
        configuration: state.configuration,
        catalog: {
          bases: studioCatalog.bases,
          walls: studioCatalog.walls,
          accessories: studioCatalog.accessories,
        },
      }),
    [state.configuration],
  );
  const usedWidth = usedWidthMm(state.configuration, studioCatalog);
  const base = studioCatalog.bases.find(
    (item) => item.code === state.configuration.baseCode,
  );
  const remainingWidth = Math.max((base?.widthMm ?? 0) - usedWidth, 0);
  const facadeProgress = Math.min(
    100,
    (usedWidth / Math.max(base?.widthMm ?? 1, 1)) * 100,
  );
  const dimensions = `${formatMeters(base?.widthMm ?? 0)} × ${formatMeters(
    base?.depthMm ?? 0,
  )} × ${formatMeters(base?.heightMm ?? 0)}`;
  const viewerStatus =
    state.webglReady === false
      ? copy.webglFallback
      : state.webglReady
        ? copy.ready
        : copy.loading;

  const downloadEstimate = async () => {
    setPdfStatus("busy");
    try {
      const bytes = await createStudioEstimatePdf({
        configuration: state.configuration,
        estimate,
        language: state.language,
        projectName: projectName.trim(),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
      });
      const pdfBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(pdfBuffer).set(bytes);
      const url = URL.createObjectURL(
        new Blob([pdfBuffer], { type: "application/pdf" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `mobup-estimate-${state.configuration.baseCode.toLowerCase()}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      setPdfStatus("ready");
    } catch {
      setPdfStatus("error");
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const code = dragCode(event);
    if (!code) return;
    if (isStudioWallCode(code)) {
      dispatch({ type: "ADD_WALL", code });
    } else if (isStudioAccessoryCode(code)) {
      dispatch({
        type: "ADD_ACCESSORY",
        code,
        targetWallId: selectedWallId,
      });
    }
  };

  return (
    <main className="mobup-shell">
      <header className="mobup-topbar">
        <a className="mobup-brand" href="#studio" aria-label="Mobup Studio">
          <span className="mobup-brand-mark">M</span>
          <span>
            <strong>Mobup</strong>
            <small>garden studio</small>
          </span>
        </a>
        <p className="mobup-topbar-label">DIRECT 3D CONFIGURATOR</p>
        <div className="mobup-language" aria-label={copy.language}>
          {(["en", "fr"] as const).map((language) => (
            <button
              className={state.language === language ? "is-active" : undefined}
              key={language}
              type="button"
              onClick={() => dispatch({ type: "SET_LANGUAGE", language })}
              aria-pressed={state.language === language}
            >
              {language.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <section className="mobup-workspace" id="studio">
        <div className="mobup-stage-panel">
          <div className="mobup-stage-head">
            <div>
              <span className="mobup-eyebrow">3D MODEL / MOBUP</span>
              <strong>
                {studioLabel(state.configuration.baseCode, state.language)}
              </strong>
            </div>
            <span className="mobup-stage-status" aria-live="polite">
              <i /> {viewerStatus}
            </span>
          </div>
          <div
            className="mobup-viewer-wrap"
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            <StudioViewer
              configuration={state.configuration}
              showAnalysis={state.showAnalysis}
              resetSignal={state.resetSignal}
              onReady={handleViewerReady}
              onError={handleViewerError}
            />
            <div className="mobup-viewer-corner mobup-viewer-corner--top">
              <span>{copy.dimensions}</span>
              <strong>{dimensions}</strong>
            </div>
            <div className="mobup-viewer-corner mobup-viewer-corner--bottom">
              <span>{copy.orbit}</span>
              <span>{copy.zoom}</span>
              <button
                type="button"
                onClick={() => dispatch({ type: "RESET_VIEW" })}
              >
                {copy.reset} ↺
              </button>
            </div>
          </div>
          <div className="mobup-stage-foot">
            <span>DROP MODULES ON THE STUDIO</span>
            <span>360° ORBIT / PBR MATERIALS</span>
          </div>
        </div>

        <aside className="mobup-inspector" aria-label="Studio configuration">
          <div className="mobup-inspector-intro">
            <div className="mobup-eyebrow">GARDEN ROOM / LIVE QUOTE</div>
            <h1>
              {copy.title.split("\n").map((line, index) => (
                <span key={line} className={index === 1 ? "accent" : undefined}>
                  {line}
                  {index === 0 ? <br /> : null}
                </span>
              ))}
            </h1>
            <p>{copy.intro}</p>
          </div>

          <section className="mobup-section">
            <div className="mobup-section-head">
              <div>
                <span className="mobup-eyebrow">01</span>
                <h2>{copy.base}</h2>
              </div>
              <span className="mobup-section-value">{dimensions}</span>
            </div>
            <div className="mobup-base-grid">
              {studioCatalog.bases.map((item) => {
                const enabled =
                  rebuildStudioConfiguration(
                    item.code,
                    state.configuration.walls,
                    state.configuration.accessories,
                  ) !== undefined;
                return (
                  <button
                    className={`mobup-base-card ${
                      item.code === state.configuration.baseCode
                        ? "is-active"
                        : ""
                    }`}
                    disabled={!enabled}
                    key={item.code}
                    type="button"
                    onClick={() => dispatch({ type: "BASE", code: item.code })}
                  >
                    <strong>{item.code}</strong>
                    <span>{formatMeters(item.widthMm)}</span>
                    <small>
                      {formatMoney(item.priceMinor, state.language)} HT
                    </small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mobup-section">
            <div className="mobup-section-head">
              <div>
                <span className="mobup-eyebrow">02</span>
                <h2>{copy.facade}</h2>
              </div>
              <span className="mobup-section-value">
                {formatMeters(remainingWidth)} {copy.remaining.toLowerCase()}
              </span>
            </div>
            <div className="mobup-progress" aria-label={copy.remaining}>
              <span style={{ width: `${facadeProgress}%` }} />
            </div>
            <div className="mobup-module-palette">
              {studioCatalog.walls.map((wall) => (
                <button
                  className="mobup-module-card"
                  draggable
                  key={wall.code}
                  type="button"
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "application/x-mobup-module",
                      wall.code,
                    );
                  }}
                  onClick={() =>
                    dispatch({ type: "ADD_WALL", code: wall.code })
                  }
                >
                  <span
                    className={`mobup-module-swatch mobup-module-swatch--${wall.kind.toLowerCase()}`}
                  />
                  <strong>{wall.code}</strong>
                  <small>{formatMeters(wall.widthMm)}</small>
                  <em>{modulePriceLabel(wall.code, state.language)} HT</em>
                </button>
              ))}
            </div>
            <div className="mobup-dropzone">
              <span>＋</span>
              <p>{copy.clickToAdd}</p>
            </div>
            <div className="mobup-placed-modules" aria-live="polite">
              {state.configuration.walls.length === 0 ? (
                <p className="mobup-empty">{copy.clickToAdd}</p>
              ) : (
                state.configuration.walls.map((wall, index) => (
                  <div
                    className={`mobup-placed-row ${
                      selectedWallId === wall.id ? "is-selected" : ""
                    }`}
                    key={wall.id}
                    onClick={() => setSelectedWallId(wall.id)}
                  >
                    <button
                      className="mobup-placed-main"
                      type="button"
                      onClick={() => setSelectedWallId(wall.id)}
                    >
                      <strong>{wall.code}</strong>
                      <span>{studioLabel(wall.code, state.language)}</span>
                    </button>
                    <div className="mobup-row-actions">
                      <button
                        type="button"
                        aria-label={`Move ${wall.code} left`}
                        disabled={index === 0}
                        onClick={() =>
                          dispatch({
                            type: "MOVE_WALL",
                            wallId: wall.id,
                            index: index - 1,
                          })
                        }
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${wall.code} right`}
                        disabled={
                          index === state.configuration.walls.length - 1
                        }
                        onClick={() =>
                          dispatch({
                            type: "MOVE_WALL",
                            wallId: wall.id,
                            index: index + 1,
                          })
                        }
                      >
                        →
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${wall.code}`}
                        onClick={() =>
                          dispatch({ type: "REMOVE_WALL", wallId: wall.id })
                        }
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="mobup-section">
            <div className="mobup-section-head">
              <div>
                <span className="mobup-eyebrow">03</span>
                <h2>{copy.accessories}</h2>
              </div>
              <span className="mobup-section-value">
                {selectedWallId ? `→ ${selectedWallId}` : copy.noWall}
              </span>
            </div>
            <div className="mobup-accessory-grid">
              {studioCatalog.accessories.map((accessory) => (
                <button
                  className="mobup-accessory-card"
                  draggable
                  key={accessory.code}
                  type="button"
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "application/x-mobup-module",
                      accessory.code,
                    );
                  }}
                  onClick={() =>
                    dispatch({
                      type: "ADD_ACCESSORY",
                      code: accessory.code,
                      targetWallId: selectedWallId,
                    })
                  }
                >
                  <span
                    className={`mobup-accessory-swatch mobup-accessory-swatch--${accessory.code.toLowerCase()}`}
                  />
                  <strong>{accessory.code}</strong>
                  <span>{studioLabel(accessory.code, state.language)}</span>
                  <em>
                    {formatMoney(accessory.priceMinor, state.language)} HT
                  </em>
                </button>
              ))}
            </div>
            {state.configuration.accessories.length > 0 ? (
              <div className="mobup-attached-list">
                {state.configuration.accessories.map((accessory) => (
                  <div className="mobup-attached-row" key={accessory.id}>
                    <span>
                      <strong>{accessory.code}</strong> →{" "}
                      {accessory.targetWallId}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${accessory.code}`}
                      onClick={() =>
                        dispatch({
                          type: "REMOVE_ACCESSORY",
                          accessoryId: accessory.id,
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="mobup-section mobup-analysis-row">
            <div>
              <span className="mobup-eyebrow">VIEW</span>
              <strong>
                {state.showAnalysis ? copy.hideAnalysis : copy.analysis}
              </strong>
            </div>
            <button
              className={`mobup-switch ${state.showAnalysis ? "is-on" : ""}`}
              type="button"
              aria-pressed={state.showAnalysis}
              onClick={() =>
                dispatch({ type: "SET_ANALYSIS", visible: !state.showAnalysis })
              }
            >
              <span />
            </button>
          </section>

          <section className="mobup-quote-card">
            <div className="mobup-eyebrow">04 / {copy.estimate}</div>
            <div className="mobup-quote-total">
              <span>{copy.total}</span>
              <strong>
                {formatMoney(estimate.totalMinor, state.language)}
              </strong>
            </div>
            <div className="mobup-quote-breakdown">
              <span>
                {copy.subtotal}
                <b>{formatMoney(estimate.subtotalMinor, state.language)}</b>
              </span>
              <span>
                {copy.vat}
                <b>{formatMoney(estimate.taxMinor, state.language)}</b>
              </span>
            </div>
            <p>{copy.nonContractual}</p>
            <details className="mobup-contact-details">
              <summary>{copy.contactOptional}</summary>
              <div className="mobup-contact-fields">
                <label>
                  <span>{copy.projectName}</span>
                  <input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    maxLength={80}
                  />
                </label>
                <label>
                  <span>{copy.customerName}</span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    maxLength={80}
                  />
                </label>
                <label>
                  <span>{copy.customerEmail}</span>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    maxLength={120}
                  />
                </label>
              </div>
            </details>
            <button
              className="mobup-download-button"
              type="button"
              disabled={pdfStatus === "busy"}
              onClick={() => void downloadEstimate()}
            >
              {pdfStatus === "busy"
                ? "..."
                : pdfStatus === "ready"
                  ? copy.downloadReady
                  : pdfStatus === "error"
                    ? copy.downloadError
                    : copy.download}
            </button>
          </section>

          {state.notice ? (
            <div className="mobup-notice" role="status">
              <span>{state.notice}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dispatch({ type: "NOTICE", message: null })}
              >
                ×
              </button>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
