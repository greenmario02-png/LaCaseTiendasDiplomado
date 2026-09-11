/**
 * Vision UI — componentes base reutilizables (móvil).
 * - VisionScreen: contenedor con fondo gradiente nocturno + glows.
 * - GlassCard: tarjeta glassmorphism.
 * - GradientIconBox: caja degradada para iconos (KPIs, títulos).
 */
import React from 'react';
import { View, ScrollView, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { vision } from '../../theme/vision';

export function VisionGlows() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {vision.glows.map((g, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: g.top,
            left: g.left,
            width: g.size,
            height: g.size,
            borderRadius: g.size / 2,
            backgroundColor: g.color,
          }}
        />
      ))}
    </View>
  );
}

/** Fondo base: gradiente + glows. Usar como fondo de pantallas o de un View absoluto. */
export function VisionBackground({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient
        colors={vision.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <VisionGlows />
    </View>
  );
}

/** Pantalla completa scrollable con fondo Vision UI. */
export function VisionScreen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.flex, style]}>
      <VisionBackground />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Tarjeta glassmorphism. */
export function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[vision.glass as any, styles.card, style]}>{children}</View>;
}

/** Caja degradada para icono (48px en web; aquí 40px). */
export function GradientIconBox({
  gradient,
  size = 40,
  radius = 12,
  children,
}: {
  gradient: readonly [string, string] | readonly string[];
  size?: number;
  radius?: number;
  children: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={gradient as readonly [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  card: { padding: 14 },
});
