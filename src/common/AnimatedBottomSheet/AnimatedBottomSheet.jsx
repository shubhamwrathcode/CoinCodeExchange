import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
export const DEFAULT_SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.82, 640);

const OPEN_MS = 230;
const CLOSE_MS = 210;
const GESTURE_LOCK_MS = 320;

/**
 * Smooth bottom sheet — fixed height + translateY (same motion as TradingDataModal).
 * Imperative API: ref.open() / ref.close()
 */
const AnimatedBottomSheet = memo(
  forwardRef(({ children, onClose, sheetHeight = DEFAULT_SHEET_HEIGHT, isDark, theme }, ref) => {
    const [mounted, setMounted] = useState(false);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const sheetAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const mountedRef = useRef(false);
    const isOpenRef = useRef(false);
    const isClosingRef = useRef(false);
    const pendingOpenRef = useRef(false);
    const ignoreBackdropUntilRef = useRef(0);
    const ignoreOpenUntilRef = useRef(0);
    const openFallbackRef = useRef(null);
    const runOpenRef = useRef(() => {});
    const runCloseRef = useRef(() => {});

    const darkMode = typeof isDark === "boolean" ? isDark : theme === "Dark";
    const backdropMax = darkMode ? 0.55 : 0.35;
    const sheetBg = darkMode ? "#0F141C" : "#FFFFFF";

    const playOpenAnim = useCallback(() => {
      if (!pendingOpenRef.current) return;
      pendingOpenRef.current = false;
      if (openFallbackRef.current) {
        clearTimeout(openFallbackRef.current);
        openFallbackRef.current = null;
      }
      isClosingRef.current = false;
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) isOpenRef.current = true;
      });
    }, [sheetAnim]);

    const runOpen = useCallback(() => {
      const now = Date.now();
      if (now < ignoreOpenUntilRef.current) return;
      if (isClosingRef.current) return;
      if (mountedRef.current || isOpenRef.current || pendingOpenRef.current) return;

      ignoreBackdropUntilRef.current = now + GESTURE_LOCK_MS;
      pendingOpenRef.current = true;
      isOpenRef.current = false;
      sheetAnim.stopAnimation();
      backdropAnim.stopAnimation();
      sheetAnim.setValue(0);
      backdropAnim.setValue(backdropMax);
      mountedRef.current = true;
      setMounted(true);
      openFallbackRef.current = setTimeout(playOpenAnim, 48);
    }, [backdropAnim, backdropMax, playOpenAnim, sheetAnim]);

    const runClose = useCallback(() => {
      if (!mountedRef.current || isClosingRef.current) return;

      ignoreOpenUntilRef.current = Date.now() + GESTURE_LOCK_MS;
      pendingOpenRef.current = false;
      isOpenRef.current = false;
      isClosingRef.current = true;
      if (openFallbackRef.current) {
        clearTimeout(openFallbackRef.current);
        openFallbackRef.current = null;
      }
      sheetAnim.stopAnimation();
      backdropAnim.stopAnimation();

      Animated.parallel([
        Animated.timing(sheetAnim, {
          toValue: 0,
          duration: CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        isClosingRef.current = false;
        if (!finished) return;
        mountedRef.current = false;
        setMounted(false);
        onCloseRef.current?.();
      });
    }, [backdropAnim, sheetAnim]);

    runOpenRef.current = runOpen;
    runCloseRef.current = runClose;

    useImperativeHandle(
      ref,
      () => ({
        open: () => runOpenRef.current(),
        close: () => runCloseRef.current(),
      }),
      []
    );

    useEffect(() => {
      return () => {
        if (openFallbackRef.current) clearTimeout(openFallbackRef.current);
      };
    }, []);

    const requestClose = useCallback(() => {
      runCloseRef.current();
    }, []);

    const requestCloseFromBackdrop = useCallback(() => {
      if (Date.now() < ignoreBackdropUntilRef.current) return;
      runCloseRef.current();
    }, []);

    const handleModalShow = useCallback(() => {
      playOpenAnim();
    }, [playOpenAnim]);

    const sheetTranslateY = sheetAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [sheetHeight, 0],
    });
    const backdropOpacity = backdropAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, backdropMax],
    });

    return (
      <Modal
        visible={mounted}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={requestClose}
        onShow={handleModalShow}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={requestCloseFromBackdrop}>
            <Animated.View
              pointerEvents="none"
              style={[styles.backdrop, { opacity: backdropOpacity }]}
            />
          </Pressable>
          <Animated.View
            style={[
              styles.sheet,
              {
                height: sheetHeight,
                backgroundColor: sheetBg,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
            collapsable={false}
          >
            {children}
          </Animated.View>
        </View>
      </Modal>
    );
  })
);

AnimatedBottomSheet.displayName = "AnimatedBottomSheet";

export default AnimatedBottomSheet;

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
});
