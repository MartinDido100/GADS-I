import { useEffect, useRef, useState } from 'react';
import { fichadaBiometrico } from '../lib/fichadasApi';
import { listEmpleados } from '../lib/empleadosApi';
import type { Empleado } from '../types';
import styles from './SimuladorFichaje.module.css';

const MAX_KEYS = 5;

interface Toast {
  id: number;
  nombre: string;
  tipo: 'E' | 'S';
  ok: boolean;
  msg?: string;
}

let seq = 0;

export function SimuladorFichaje() {
  const empleadosRef = useRef<Empleado[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listEmpleados({ activo: true })
      .then((all) => {
        empleadosRef.current = all
          .sort((a, b) => a.legajo - b.legajo)
          .slice(0, MAX_KEYS);
      })
      .catch(() => {});
  }, []);

  function addToast(nombre: string, tipo: 'E' | 'S', ok: boolean, msg?: string) {
    const id = ++seq;
    setToasts((prev) => [...prev.slice(-4), { id, nombre, tipo, ok, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }

  async function fichar(idx: number) {
    const emp = empleadosRef.current[idx];
    if (!emp) return;
    try {
      const f = await fichadaBiometrico(emp.legajo);
      addToast(emp.nombre, f.entrada_salida, true);
    } catch (err: unknown) {
      addToast(emp.nombre, 'E', false, err instanceof Error ? err.message : 'Error');
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < MAX_KEYS) void fichar(idx);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.toastStack}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${t.ok ? (t.tipo === 'E' ? styles.toastEntrada : styles.toastSalida) : styles.toastErr}`}>
          <span className={styles.toastDot} />
          <div className={styles.toastBody}>
            <span className={styles.toastNombre}>{t.nombre}</span>
            <span className={styles.toastTipo}>
              {t.ok ? (t.tipo === 'E' ? 'Entrada registrada' : 'Salida registrada') : t.msg}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
