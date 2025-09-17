export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Resumen</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-md p-4">Interacciones hoy</div>
        <div className="border rounded-md p-4">Tiempo de respuesta</div>
        <div className="border rounded-md p-4">Conversiones</div>
      </div>
    </div>
  );
}
