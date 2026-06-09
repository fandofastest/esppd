export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#252c38]/18 backdrop-blur-[1px]">
      <div className="rounded-[24px] bg-white px-6 py-5 text-center shadow-xl">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ffd5d2] border-t-[#e2342d]" />
        <p className="mt-4 text-sm font-semibold text-[#252c38]">Memuat proses...</p>
        <p className="mt-1 text-sm text-[#7d8598]">Mohon tunggu sebentar</p>
      </div>
    </div>
  );
}
