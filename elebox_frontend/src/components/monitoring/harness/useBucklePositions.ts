import { useCallback, useState } from 'react';
import type { BuckleKey } from '@/constants/harnessBuckles';
import {
  clearSavedBucklePositions,
  DEFAULT_BUCKLE_POSITIONS,
  loadBucklePositions,
  saveBucklePositions,
  type BucklePositionsMap,
} from '@/constants/harnessBucklePositions';

const clonePositions = (positions: BucklePositionsMap): BucklePositionsMap => ({
  buckle1: { ...positions.buckle1 },
  buckle2: { ...positions.buckle2 },
  buckle3: { ...positions.buckle3 },
});

export const useBucklePositions = () => {
  const [savedPositions, setSavedPositions] = useState<BucklePositionsMap>(() => loadBucklePositions());
  const [draftPositions, setDraftPositions] = useState<BucklePositionsMap>(() => loadBucklePositions());

  const updateDraftPosition = useCallback((key: BuckleKey, position: { x: number; y: number }) => {
    setDraftPositions((prev) => ({
      ...prev,
      [key]: position,
    }));
  }, []);

  const beginCalibration = useCallback(() => {
    setDraftPositions(clonePositions(savedPositions));
  }, [savedPositions]);

  const cancelCalibration = useCallback(() => {
    setDraftPositions(clonePositions(savedPositions));
  }, [savedPositions]);

  const saveCalibration = useCallback(() => {
    const next = clonePositions(draftPositions);
    saveBucklePositions(next);
    setSavedPositions(next);
    return next;
  }, [draftPositions]);

  const resetDraftToDefault = useCallback(() => {
    setDraftPositions(clonePositions(DEFAULT_BUCKLE_POSITIONS));
  }, []);

  const resetSavedToDefault = useCallback(() => {
    clearSavedBucklePositions();
    const defaults = clonePositions(DEFAULT_BUCKLE_POSITIONS);
    setSavedPositions(defaults);
    setDraftPositions(defaults);
    return defaults;
  }, []);

  return {
    savedPositions,
    draftPositions,
    updateDraftPosition,
    beginCalibration,
    cancelCalibration,
    saveCalibration,
    resetDraftToDefault,
    resetSavedToDefault,
  };
};
