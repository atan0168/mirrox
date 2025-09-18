import {
  Camera,
  CameraRef,
  CircleLayer,
  FillLayer,
  LineLayer,
  MapView,
  OnPressEvent,
  ShapeSource,
  SymbolLayer,
} from '@maplibre/maplibre-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { asPointFeature, asPolygonFeature } from '../../utils/geoUtils';
import { STYLE_URL } from '../../constants';

type PointFeature = {
  lat: number;
  lng: number;
  label?: string;
  name?: string;
  subtitle?: string;
};

type PolygonFeature = {
  // Geo-style rings: [[[lng, lat], ...], ...]
  rings: number[][][];
  label?: string;
  name?: string;
  subtitle?: string;
};

export type DengueSelection =
  | {
      type: 'point';
      name?: string;
      label?: string;
      subtitle?: string;
      coordinates: { lat: number; lng: number };
    }
  | {
      type: 'polygon';
      name?: string;
      label?: string;
      subtitle?: string;
      rings: number[][][];
    }
  | {
      type: 'coordinates';
      coordinates: { lat: number; lng: number };
    };

interface DengueMapProps {
  points?: PointFeature[];
  polygons?: PolygonFeature[];
  center?: { lat: number; lng: number } | null;
  height?: number;
  onSelectionChange?: (selection: DengueSelection | null) => void;
}

export const DengueMap: React.FC<DengueMapProps> = ({
  points = [],
  polygons = [],
  center,
  height = 320,
  onSelectionChange,
}) => {
  return (
    <NativeDengueMap
      points={points}
      polygons={polygons}
      center={center}
      height={height}
      onSelectionChange={onSelectionChange}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
});

type NativeProps = DengueMapProps;

const NativeDengueMap: React.FC<NativeProps> = ({
  points,
  polygons,
  center,
  height,
  onSelectionChange,
}) => {
  const cameraRef = useRef<CameraRef>(null);

  const [mapReady, setMapReady] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedPolyUid, setSelectedPolyUid] = useState<string | null>(null);

  const pointsFC = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: (points || []).map((p, i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: {
          uid: String(i),
          label: p.label || '',
          name: p.name || '',
          subtitle: p.subtitle || '',
        },
      })),
    }),
    [points]
  );

  const polysFC = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: (polygons || []).map((poly, i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: poly.rings || [] },
        properties: {
          uid: String(i),
          label: poly.label || '',
          name: poly.name || '',
          subtitle: poly.subtitle || '',
        },
      })),
    }),
    [polygons]
  );

  const userFC = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: center
        ? [
            {
              type: 'Feature' as const,
              geometry: {
                type: 'Point' as const,
                coordinates: [center.lng, center.lat],
              },
              properties: {},
            },
          ]
        : [],
    }),
    [center]
  );

  const fitToData = useCallback(() => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    points?.forEach(p => {
      const x = p.lng,
        y = p.lat;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    polygons?.forEach(poly => {
      (poly.rings || []).forEach(ring =>
        ring.forEach(([x, y]) => {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        })
      );
    });
    if (isFinite(minX)) {
      // Use explicit NE and SW order for fitBounds
      const ne: [number, number] = [maxX, maxY];
      const sw: [number, number] = [minX, minY];
      cameraRef.current?.fitBounds(ne, sw, 40, 300);
    } else if (center) {
      cameraRef.current?.setCamera({
        centerCoordinate: [center.lng, center.lat],
        zoomLevel: 12,
        animationDuration: 300,
      });
    } else {
      cameraRef.current?.setCamera({
        centerCoordinate: [101.6869, 3.139],
        zoomLevel: 6,
        animationDuration: 0,
      });
    }
  }, [points, polygons, center]);

  // Fit once the style is ready, and whenever data changes thereafter
  useEffect(() => {
    if (mapReady) {
      fitToData();
    }
  }, [mapReady, fitToData]);

  const handlePointPress = useCallback(
    (e: OnPressEvent) => {
      const f = asPointFeature(e?.features?.[0] as unknown);
      const uid = f?.properties?.uid?.toString?.();
      if (!uid) return;

      setSelectedUid(uid);
      setSelectedPolyUid(null);

      const coords = f?.geometry?.coordinates;
      const lng = coords?.[0];
      const lat = coords?.[1];
      if (
        onSelectionChange &&
        typeof lat === 'number' &&
        typeof lng === 'number'
      ) {
        onSelectionChange({
          type: 'point',
          name: f?.properties?.name,
          label: f?.properties?.label,
          subtitle: f?.properties?.subtitle,
          coordinates: { lat, lng },
        });
      }
    },
    [onSelectionChange]
  );

  const handlePolygonPress = useCallback(
    (e: OnPressEvent) => {
      const f = asPolygonFeature(e?.features?.[0] as unknown);
      const uid = f?.properties?.uid?.toString?.();
      if (!uid) return;

      setSelectedPolyUid(uid);
      setSelectedUid(null);

      if (onSelectionChange) {
        onSelectionChange({
          type: 'polygon',
          name: f?.properties?.name,
          label: f?.properties?.label,
          subtitle: f?.properties?.subtitle,
          rings: f?.geometry?.coordinates ?? [],
        });
      }
    },
    [onSelectionChange]
  );

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={{ flex: 1 }}
        mapStyle={STYLE_URL}
        onDidFinishLoadingStyle={() => setMapReady(true)}
        onPress={() => {
          if (selectedUid) setSelectedUid(null);
          if (selectedPolyUid) setSelectedPolyUid(null);
          // Clear selection on map background tap
          onSelectionChange?.(null);
        }}
      >
        <Camera ref={cameraRef} />

        {/* Polygons */}
        <ShapeSource id="polygons" shape={polysFC} onPress={handlePolygonPress}>
          <FillLayer
            id="polygons-fill"
            style={{ fillColor: '#fdba74', fillOpacity: 0.25 }}
          />
          <LineLayer
            id="polygons-outline"
            style={{ lineColor: '#f87171', lineWidth: 2 }}
          />

          {/* Selected polygon highlight */}
          {selectedPolyUid && (
            <FillLayer
              id="polygons-fill-selected"
              filter={['==', ['get', 'uid'], selectedPolyUid]}
              style={{ fillColor: '#fdba74', fillOpacity: 0.45 }}
            />
          )}
          {selectedPolyUid && (
            <LineLayer
              id="polygons-outline-selected"
              filter={['==', ['get', 'uid'], selectedPolyUid]}
              style={{ lineColor: '#b91c1c', lineWidth: 3 }}
            />
          )}

          {selectedPolyUid && (
            <SymbolLayer
              id="polygons-label-selected"
              filter={['==', ['get', 'uid'], selectedPolyUid]}
              style={{
                textField: [
                  'concat',
                  'Cases: ',
                  [
                    'to-string',
                    ['coalesce', ['get', 'label'], ['get', 'subtitle'], 0],
                  ],
                ],
                symbolPlacement: 'point',
                symbolAvoidEdges: true,
                symbolSortKey: ['get', 'name'],
                textFont: ['Noto Sans Regular'],
                textSize: 12,
                textOffset: [0.5, 2],
                textColor: '#111',
              }}
            />
          )}
        </ShapeSource>

        {/* Points */}
        <ShapeSource id="points" shape={pointsFC} onPress={handlePointPress}>
          {/* Base circle marker */}
          <CircleLayer
            id="points-circle"
            style={{
              circleRadius: 6,
              circleColor: '#f87171',
              circleStrokeColor: '#dc2626',
              circleStrokeWidth: 2,
              circleOpacity: 0.8,
            }}
          />

          {/* Selected point highlight */}
          {selectedUid && (
            <CircleLayer
              id="points-circle-selected"
              filter={['==', ['get', 'uid'], selectedUid]}
              style={{
                circleRadius: 10,
                circleColor: '#fca5a5',
                circleStrokeColor: '#b91c1c',
                circleStrokeWidth: 2,
                circleOpacity: 0.9,
              }}
            />
          )}

          {/* Selected point label via SymbolLayer */}
          {selectedUid && (
            <SymbolLayer
              id="points-label-selected"
              filter={['==', ['get', 'uid'], selectedUid]}
              style={{
                textField: [
                  'concat',
                  'Cases: ',
                  [
                    'to-string',
                    ['coalesce', ['get', 'label'], ['get', 'subtitle'], 0],
                  ],
                ],
                textSize: 14,
                textFont: ['Noto Sans Regular'],
                textColor: '#111827',
                textHaloColor: '#ffffff',
                textHaloWidth: 2,
                textAnchor: 'top',
                textLineHeight: 1.15,
                textOffset: [0, 1.0],
                textAllowOverlap: true,
                textIgnorePlacement: true,
              }}
            />
          )}
        </ShapeSource>

        {/* User location */}
        <ShapeSource id="user" shape={userFC}>
          <CircleLayer
            id="user-point"
            style={{
              circleRadius: 6,
              circleColor: '#2563eb',
              circleStrokeColor: '#93c5fd',
              circleStrokeWidth: 2,
            }}
          />
        </ShapeSource>
      </MapView>
    </View>
  );
};

export default DengueMap;
