import Closure from '@/models/Closure';

export async function isDayClosed(date) {
  const d = new Date(date);
  const startOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  
  const closure = await Closure.findOne({ date: startOfDay });
  return !!closure;
}
