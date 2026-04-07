// src/components/TimePicker.js
//
// Reusable time picker component.
// Uses native DateTimePicker in time mode.
//
// Usage:
//   <TimePicker label="Start time" value={startTime} onChange={setStartTime} />
//   value and onChange use "HH:MM" string format (e.g. "09:00")

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, Platform, Pressable,
} from 'react-native';
import { colors, typography, spacing, radius } from '../lib/tokens';

let DateTimePicker;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (e) {
  DateTimePicker = null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Convert "HH:MM" string → Date object (today's date at that time)
function timeStrToDate(str) {
  if (!str) return new Date();
  const [h, m] = str.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

// Convert Date → "HH:MM" string
function dateToTimeStr(date) {
  if (!date) return '';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Format for display: "09:00" → "9:00 AM"
function formatTimeDisplay(str) {
  if (!str) return '';
  const [h, m] = str.split(':').map(Number);
  const ampm  = h >= 12 ? 'PM' : 'AM';
  const hour  = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── Time picker ───────────────────────────────────────────────────────────────

export function TimePicker({ label, value, onChange, placeholder = 'Select time' }) {
  const [show,     setShow]     = useState(false);
  const [tempDate, setTempDate] = useState(null);

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selectedDate) {
        onChange(dateToTimeStr(selectedDate));
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleDone = () => {
    if (tempDate) onChange(dateToTimeStr(tempDate));
    setTempDate(null);
    setShow(false);
  };

  const handleCancel = () => {
    setTempDate(null);
    setShow(false);
  };

  const handleOpen = () => {
    setTempDate(value ? timeStrToDate(value) : new Date());
    setShow(true);
  };

  if (!DateTimePicker) {
    return (
      <View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.field}>
          <Text style={styles.fieldPlaceholder}>Install @react-native-community/datetimepicker</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.field, value && styles.fieldFilled]}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        {/* Clock icon — CSS drawn */}
        <View style={styles.clockIcon}>
          <View style={styles.clockFace} />
          <View style={styles.clockHour} />
          <View style={styles.clockMin} />
        </View>
        <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]}>
          {value ? formatTimeDisplay(value) : placeholder}
        </Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </TouchableOpacity>

      {/* Android — native dialog */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={value ? timeStrToDate(value) : new Date()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleChange}
        />
      )}

      {/* iOS — bottom sheet with spinner */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={handleCancel}>
          <Pressable style={styles.overlay} onPress={handleCancel}>
            <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>{label || 'Select time'}</Text>
                <TouchableOpacity onPress={handleDone} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate || (value ? timeStrToDate(value) : new Date())}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleChange}
                style={{ width: '100%', height: 200 }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ── Time range (start + end together) ────────────────────────────────────────

export function TimeRangePicker({ startTime, endTime, onStartChange, onEndChange, startLabel = 'Start time', endLabel = 'End time' }) {
  return (
    <View style={styles.rangeWrap}>
      <View style={{ flex: 1 }}>
        <TimePicker label={startLabel} value={startTime} onChange={onStartChange} />
      </View>
      <View style={styles.rangeSep}>
        <Text style={styles.rangeSepText}>—</Text>
      </View>
      <View style={{ flex: 1 }}>
        <TimePicker label={endLabel} value={endTime} onChange={onEndChange} placeholder="Optional" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label:           { fontSize: 11, fontWeight: typography.bold, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  field:           { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, backgroundColor: colors.white },
  fieldFilled:     { borderColor: colors.brand + '60', backgroundColor: '#EFF6FF' },
  clockIcon:       { width: 16, height: 16, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  clockFace:       { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.muted, position: 'absolute' },
  clockHour:       { width: 1.5, height: 4, backgroundColor: colors.muted, borderRadius: 1, position: 'absolute', bottom: '50%', left: '50%', marginLeft: -0.75, transformOrigin: 'bottom', transform: [{ rotate: '0deg' }] },
  clockMin:        { width: 1.5, height: 5, backgroundColor: colors.muted, borderRadius: 1, position: 'absolute', bottom: '50%', left: '50%', marginLeft: -0.75, transformOrigin: 'bottom', transform: [{ rotate: '90deg' }] },
  fieldText:       { flex: 1, fontSize: 14, color: colors.black, fontWeight: typography.medium },
  fieldPlaceholder:{ color: colors.placeholder, fontWeight: '400' },
  clearBtn:        { fontSize: 13, color: colors.placeholder },
  chevron:         { fontSize: 16, color: colors.placeholder },
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  sheetHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.page, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  sheetTitle:      { fontSize: 15, fontWeight: typography.semibold, color: colors.black },
  cancelText:      { fontSize: 15, color: colors.muted },
  doneText:        { fontSize: 15, color: colors.brand, fontWeight: typography.semibold },
  rangeWrap:       { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  rangeSep:        { paddingBottom: 14 },
  rangeSepText:    { fontSize: 16, color: colors.muted },
});