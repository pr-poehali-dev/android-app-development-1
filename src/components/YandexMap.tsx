import { useEffect, useRef } from "react";

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
}

export default function YandexMap({ fromAddress, toAddress, height = "100%" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromPlacemarkRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toPlacemarkRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeRef = useRef<any>(null);

  useEffect(() => {
    const init = () => {
      if (!containerRef.current || mapRef.current) return;
      mapRef.current = new window.ymaps.Map(containerRef.current, {
        center: [55.751574, 37.573856],
        zoom: 12,
        controls: [],
      }, {
        suppressMapOpenBlock: true,
      });
    };

    if (window.ymaps) {
      window.ymaps.ready(init);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.ymaps) return;

    const map = mapRef.current;

    const geocodeAndMark = async () => {
      if (fromPlacemarkRef.current) map.geoObjects.remove(fromPlacemarkRef.current);
      if (toPlacemarkRef.current) map.geoObjects.remove(toPlacemarkRef.current);
      if (routeRef.current) map.geoObjects.remove(routeRef.current);

      fromPlacemarkRef.current = null;
      toPlacemarkRef.current = null;
      routeRef.current = null;

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

  return <div ref={containerRef} style={{ width: "100%", height, position: "relative" }} />;
}
