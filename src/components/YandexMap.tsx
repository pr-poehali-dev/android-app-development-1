import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ymaps: any;
  }
}

interface Props {
  fromAddress?: string;
  toAddress?: string;
  height?: number | string;
  pickMode?: "from" | "to" | null;
  onMapPick?: (address: string) => void;
}

export default function YandexMap({ fromAddress, toAddress, height = "100%", pickMode, onMapPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromPlacemarkRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toPlacemarkRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pickPlacemarkRef = useRef<any>(null);
  const onMapPickRef = useRef(onMapPick);
  const pickModeRef = useRef(pickMode);

  onMapPickRef.current = onMapPick;
  pickModeRef.current = pickMode;

  const handleClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (e: any) => {
      if (!pickModeRef.current || !onMapPickRef.current || !window.ymaps) return;
      const coords = e.get("coords");
      if (!coords) return;

      const map = mapRef.current;
      if (pickPlacemarkRef.current) map.geoObjects.remove(pickPlacemarkRef.current);

      const color = pickModeRef.current === "from" ? "islands#greenCircleDotIcon" : "islands#yellowCircleDotIcon";
      pickPlacemarkRef.current = new window.ymaps.Placemark(coords, {}, { preset: color });
      map.geoObjects.add(pickPlacemarkRef.current);

      const res = await window.ymaps.geocode(coords, { results: 1 }).catch(() => null);
      const obj = res?.geoObjects.get(0);
      if (obj) {
        const addr = obj.getAddressLine();
        onMapPickRef.current(addr);
      }
    },
    []
  );

  useEffect(() => {
    const init = () => {
      if (!containerRef.current || mapRef.current) return;
      mapRef.current = new window.ymaps.Map(containerRef.current, {
        center: [52.0515, 113.4712],
        zoom: 13,
        controls: [],
      }, {
        suppressMapOpenBlock: true,
      });
      mapRef.current.events.add("click", handleClick);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (mapRef.current) {
              mapRef.current.setCenter([pos.coords.latitude, pos.coords.longitude], 14, { duration: 600 });
            }
          },
          () => {},
          { timeout: 5000, enableHighAccuracy: false }
        );
      }
    };

    if (window.ymaps) {
      window.ymaps.ready(init);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.events.remove("click", handleClick);
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [handleClick]);

  useEffect(() => {
    if (!mapRef.current || !window.ymaps) return;
    const map = mapRef.current;

    const geocodeAndMark = async () => {
      if (fromPlacemarkRef.current) map.geoObjects.remove(fromPlacemarkRef.current);
      if (toPlacemarkRef.current) map.geoObjects.remove(toPlacemarkRef.current);
      if (routeRef.current) map.geoObjects.remove(routeRef.current);
      if (pickPlacemarkRef.current) map.geoObjects.remove(pickPlacemarkRef.current);

      fromPlacemarkRef.current = null;
      toPlacemarkRef.current = null;
      routeRef.current = null;
      pickPlacemarkRef.current = null;

      if (fromAddress && fromAddress.length > 3) {
        const res = await window.ymaps.geocode(fromAddress, { results: 1 }).catch(() => null);
        const obj = res?.geoObjects.get(0);
        if (obj) {
          const coords = obj.geometry.getCoordinates();
          fromPlacemarkRef.current = new window.ymaps.Placemark(coords, {}, { preset: "islands#greenDotIcon" });
          map.geoObjects.add(fromPlacemarkRef.current);
          map.setCenter(coords, 14, { duration: 400 });
        }
      }

      if (toAddress && toAddress.length > 3) {
        const res = await window.ymaps.geocode(toAddress, { results: 1 }).catch(() => null);
        const obj = res?.geoObjects.get(0);
        if (obj) {
          const coords = obj.geometry.getCoordinates();
          toPlacemarkRef.current = new window.ymaps.Placemark(coords, {}, { preset: "islands#yellowDotIcon" });
          map.geoObjects.add(toPlacemarkRef.current);
        }
      }

      if (fromAddress && toAddress && fromAddress.length > 3 && toAddress.length > 3) {
        const route = await window.ymaps.route([fromAddress, toAddress], { routingMode: "auto" }).catch(() => null);
        if (route) {
          routeRef.current = route;
          map.geoObjects.add(route);
          map.setBounds(route.getBounds(), { checkZoomRange: true, zoomMargin: 30, duration: 400 });
        }
      }
    };

    const timer = setTimeout(geocodeAndMark, 800);
    return () => clearTimeout(timer);
  }, [fromAddress, toAddress]);

  return (
    <div style={{ width: "100%", height, position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {pickMode && (
        <div style={{
          position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
          background: pickMode === "from" ? "var(--taxi-green)" : "var(--taxi-yellow)",
          color: "var(--taxi-dark)", padding: "8px 16px", borderRadius: 20,
          fontFamily: "Montserrat", fontWeight: 700, fontSize: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)", zIndex: 10,
          animation: "fadeSlideUp 0.3s ease",
          pointerEvents: "none",
        }}>
          {pickMode === "from" ? "Тапните: откуда" : "Тапните: куда"}
        </div>
      )}
    </div>
  );
}