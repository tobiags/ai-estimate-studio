"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { application, plugin } from "claygl";
import type { camera as clayCamera } from "claygl";
import type { StudioConfiguration } from "@ai-estimate-studio/domain";
import type { StudioEnvironmentCode } from "../studio/environments";
import { createClayStudioModel } from "./clay-studio-model";
import { loadClayEnvironmentAssets } from "./studio-environment-assets";

export type ClayStudioViewerProps = Readonly<{
  configuration: StudioConfiguration;
  environment?: StudioEnvironmentCode;
  showAnalysis?: boolean;
  resetSignal?: number;
  className?: string;
  style?: CSSProperties;
  onReady?: (ready: boolean) => void;
  onError?: (message: string) => void;
}>;

const maxPixelRatio = 2;

export function ClayStudioViewer({
  configuration,
  environment = "garden",
  showAnalysis = false,
  resetSignal = 0,
  className,
  style,
  onReady,
  onError,
}: ClayStudioViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const appRef = useRef<application.App3D | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    let app: application.App3D | null = null;
    let control: plugin.OrbitControl | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const setup = async () => {
      try {
        app = application.create(container, {
          width: container.clientWidth || 1,
          height: container.clientHeight || 1,
          devicePixelRatio: Math.min(window.devicePixelRatio, maxPixelRatio),
          graphic: {
            shadow: true,
            tonemapping: true,
          },
          autoRender: true,
          // ClayGL expects a loop callback even when the scene is static. The
          // orbit plugin drives camera updates through the shared timeline.
          loop() {},
          init(instance) {
            if (!active) return;

            instance.renderer.clearColor = [0.91, 0.9, 0.87, 1];
            const camera = instance.createCamera(
              [7, 4.4, 7],
              [0, 1, 0],
            ) as clayCamera.Perspective;
            camera.fov = 42;
            camera.near = 0.1;
            camera.far = 100;
            camera.updateProjectionMatrix();
            instance.createAmbientLight("#fff8ed", 0.42);
            instance.createDirectionalLight([-1, -1.4, -1], "#fff5e8", 2.1);
            instance.createDirectionalLight([0.7, -0.3, 0.4], "#d6e7ff", 0.45);

            const model = createClayStudioModel(
              instance,
              configuration,
              environment,
            );
            (model.analysis as unknown as { invisible: boolean }).invisible =
              !showAnalysis;

            // ProceduralTerrains-inspired height fields provide the broad
            // context. Local CC0 Poly Haven assets add close-range silhouettes
            // without making the public demo depend on a runtime API.
            void loadClayEnvironmentAssets(instance, model.root, environment);

            control = new plugin.OrbitControl({
              target: camera,
              domElement: instance.renderer.canvas,
              timeline: instance.timeline,
              minDistance: 3.8,
              maxDistance: 18,
              minAlpha: 7,
              maxAlpha: 72,
              minBeta: -Infinity,
              maxBeta: Infinity,
              damping: 0.82,
              rotateSensitivity: 0.85,
              zoomSensitivity: 0.8,
            });
            control.setCenter([0, 1, 0]);
            control.setAlpha(22);
            control.setBeta(45);
            control.setDistance(9.8);
            resetRef.current = () => {
              control?.animateTo({
                center: [0, 1, 0],
                alpha: 22,
                beta: 45,
                distance: 9.8,
                duration: 260,
              });
            };
            instance.renderer.canvas.className = "studio-viewer__canvas";
            instance.renderer.canvas.setAttribute(
              "aria-label",
              "Mobup 3D studio viewer rendered with ClayGL",
            );
            onReady?.(true);
          },
        });
        appRef.current = app;

        const resize = () => {
          if (!app) return;
          app.resize(container.clientWidth || 1, container.clientHeight || 1);
          app.renderer.setDevicePixelRatio(
            Math.min(window.devicePixelRatio, maxPixelRatio),
          );
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();
      } catch (error) {
        onReady?.(false);
        onError?.(
          error instanceof Error
            ? error.message
            : "ClayGL n’a pas pu initialiser le rendu 3D.",
        );
      }
    };

    void setup();

    return () => {
      active = false;
      resizeObserver?.disconnect();
      resetRef.current = null;
      control?.dispose();
      app?.dispose();
      if (appRef.current === app) appRef.current = null;
    };
  }, [configuration, environment, onError, onReady, showAnalysis]);

  useEffect(() => {
    resetRef.current?.();
  }, [resetSignal]);

  return (
    <div
      ref={containerRef}
      className={`studio-viewer${className ? ` ${className}` : ""}`}
      style={style}
      role="img"
      aria-label="Visualisation 3D interactive du studio de jardin Mobup avec ClayGL"
    />
  );
}
