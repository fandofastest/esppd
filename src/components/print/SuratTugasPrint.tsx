interface PelaksanaSuratTugas {
  nama: string;
  jabatan: string;
}

interface SuratTugasPrintProps {
  nomorSt: string;
  tanggalSt: string;
  maksudPerjalanan: string;
  lokasiAsal: string;
  lokasiTujuan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  pelaksana: PelaksanaSuratTugas[];
  pembuka: string;
  isi: string;
  penutup: string;
  pejabatJabatan: string;
  pejabatNama: string;
  pejabatNip?: string;
}

function renderParagraf(teks: string, className = "") {
  return teks
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => (
      <p key={`${item}-${index}`} className={className}>
        {item}
      </p>
    ));
}

function renderButirHuruf(teks: string) {
  return teks
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => {
      const cocokButir = item.match(/^([a-z])\.\s+(.*)$/i);

      if (!cocokButir) {
        return (
          <p key={`${item}-${index}`} className="pl-[6mm]">
            {item}
          </p>
        );
      }

      return (
        <div key={`${item}-${index}`} className="grid grid-cols-[6mm_1fr] gap-0">
          <div>{cocokButir[1]}.</div>
          <div>{cocokButir[2]}</div>
        </div>
      );
    });
}

function InfoBaris(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[26mm_6mm_1fr] gap-0">
      <div>{props.label}</div>
      <div>:</div>
      <div className="space-y-[1.2mm]">{props.children}</div>
    </div>
  );
}

export function SuratTugasPrint(props: SuratTugasPrintProps) {
  return (
    <article className="print-page mx-auto min-h-[297mm] w-[210mm] bg-white px-[16mm] pb-[16mm] pt-[8mm] text-black [font-family:Arial,Helvetica,sans-serif]">
      <header className="text-center">
        <img
          src="/logo-kpu.png"
          alt="Logo KPU"
          className="mx-auto h-[31mm] w-[31mm] object-contain"
        />
        <p className="mt-[1mm] text-[14.05pt] leading-[1.1] uppercase">Komisi Pemilihan Umum</p>
        <p className="text-[14.05pt] leading-[1.1] uppercase">Kota Dumai</p>

        <div className="mt-[6mm]">
          <p className="inline-block border-b-[1.2pt] border-black px-[1mm] pb-[0.3mm] text-[16pt] font-bold uppercase leading-none">
            Surat Tugas
          </p>
          <p className="mt-0 text-[12pt] uppercase leading-none">Nomor : {props.nomorSt}</p>
        </div>
      </header>

      <section className="mt-[3mm] space-y-[2.8mm] text-[12pt] leading-[1.18]">
        <InfoBaris label="Menimbang">{renderParagraf(props.pembuka)}</InfoBaris>

        <InfoBaris label="Dasar">{renderParagraf(props.isi)}</InfoBaris>

        <div className="pt-[1mm] text-center text-[12pt] font-bold">Memberi Tugas</div>

        <InfoBaris label="Kepada">
          <div className="space-y-[1.8mm]">
            {props.pelaksana.map((item, index) => (
              <div key={`${item.nama}-${index}`} className="space-y-[0.4mm]">
                <div className="grid grid-cols-[20mm_6mm_1fr]">
                  <div>{index + 1}. Nama</div>
                  <div>:</div>
                  <div className="uppercase">{item.nama}</div>
                </div>
                <div className="grid grid-cols-[20mm_6mm_1fr]">
                  <div className="pl-[5mm]">Jabatan</div>
                  <div>:</div>
                  <div>{item.jabatan}</div>
                </div>
              </div>
            ))}
          </div>
        </InfoBaris>

        <InfoBaris label="Untuk">
          <div className="space-y-[1.2mm]">
            {renderButirHuruf(
              `a. Melaksanakan tugas untuk ${props.maksudPerjalanan} dengan rute ${props.lokasiAsal} ke ${props.lokasiTujuan}, selama perjalanan tanggal ${props.tanggalMulai} s.d. ${props.tanggalSelesai}.`,
            )}
            {renderButirHuruf(props.penutup)}
          </div>
        </InfoBaris>

        <p className="pt-[1mm] text-center">
          Demikianlah untuk dapat dilaksanakan sebagaimana mestinya
        </p>
      </section>

      <footer className="mt-[8mm] grid grid-cols-[1fr_66mm] text-[11.05pt]">
        <div />
        <div className="text-center leading-[1.12]">
          <p>Dumai, {props.tanggalSt}</p>
          <p className="mt-[1mm] font-bold uppercase">{props.pejabatJabatan}</p>
          <div className="h-[22mm]" />
          <p className="font-bold uppercase">{props.pejabatNama || "(..........................)"}</p>
          {props.pejabatNip ? <p className="mt-[0.8mm]">NIP. {props.pejabatNip}</p> : null}
        </div>
      </footer>
    </article>
  );
}
