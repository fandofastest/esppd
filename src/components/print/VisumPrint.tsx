import React from "react";

interface PelaksanaPegawai {
  nama: string;
  nip_nik?: string;
  pangkat_golongan: string;
  jabatan: string;
}

interface VisumPrintProps {
  judul: string;
  nomorSt: string;
  tanggalSt: string;
  lokasiAsal: string;
  lokasiTujuan: string;
  maksudPerjalanan?: string;
  daftarTujuanDalamKota?: string[];
  tanggalMulai: string;
  tanggalSelesai: string;
  pelaksana: PelaksanaPegawai[];
  jumlahHari: number;
  jenisPerjalanan: string;
  tujuanProvinsi: string;
  pengantar: string;
  catatan: string;
  penutup: string;
  pejabatJabatan: string;
  pejabatNama: string;
  pejabatNip: string;
  mataAnggaran?: string;
}

function terbilangHari(jumlahHari: number): string {
  const kata = [
    "Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", 
    "Delapan", "Sembilan", "Sepuluh", "Sebelas", "Dua Belas", 
    "Tiga Belas", "Empat Belas", "Lima Belas", "Enam Belas", 
    "Tujuh Belas", "Delapan Belas", "Sembilan Belas", "Dua Puluh"
  ];
  const kataHari = kata[jumlahHari] || String(jumlahHari);
  return `${jumlahHari} (${kataHari}) Hari`;
}

function tentukanTingkatBiaya(pangkatGolongan: string) {
  const pg = pangkatGolongan.toUpperCase();
  if (pg.includes("IV")) return "Golongan IV";
  if (pg.includes("III")) return "Golongan III";
  if (pg.includes("II")) return "Golongan II";
  if (pg.includes("I") && !pg.includes("IX")) return "Golongan I";
  return pangkatGolongan || "-";
}

interface FieldItem {
  label: string;
  value?: string;
}

interface VisumRowCell {
  nomor?: string;
  items?: FieldItem[];
  note?: React.ReactNode;
  signatureLine?: boolean;
  tandaTangan?: React.ReactNode;
  minHeight?: string;
}

interface VisumRow {
  kiri: VisumRowCell;
  kanan: VisumRowCell;
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

function roman(nomor: number) {
  const values = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ] as const;

  let remaining = nomor;
  let result = "";
  for (const [value, symbol] of values) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }

  return `${result || nomor}.`;
}

function FieldBlock({ items }: { items: FieldItem[] }) {
  return (
    <div className="space-y-[0.5mm]">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="grid grid-cols-[25mm_4mm_1fr]">
          <div>{item.label}</div>
          <div>:</div>
          <div>{item.value ?? ""}</div>
        </div>
      ))}
    </div>
  );
}

function TandaTanganBlock(props: {
  jabatan: string;
  nama: string;
  nip: string;
  compact?: boolean;
}) {
  return (
    <div className={`text-center ${props.compact ? "mt-[4mm]" : "mt-[7mm]"}`}>
      <p className="font-bold">{props.jabatan}</p>
      <div className={props.compact ? "h-[8mm]" : "h-[15mm]"} />
      <p className="font-bold uppercase">{props.nama}</p>
      <p className="font-bold">NIP. {props.nip}</p>
    </div>
  );
}

function VisumCell(props: {
  nomor?: string;
  items?: FieldItem[];
  note?: React.ReactNode;
  signatureLine?: boolean;
  tandaTangan?: React.ReactNode;
  minHeight?: string;
}) {
  return (
    <div className={`flex h-full flex-col px-[3.5mm] py-[2.3mm] ${props.minHeight ?? "min-h-[33mm]"}`}>
      {props.nomor ? (
        <div className="grid grid-cols-[8mm_1fr] gap-[1mm]">
          <div>{props.nomor}</div>
          <div>{props.items ? <FieldBlock items={props.items} /> : null}</div>
        </div>
      ) : props.items ? (
        <FieldBlock items={props.items} />
      ) : (
        <div />
      )}

      {props.note ? <div className="mt-[1.8mm] space-y-[0.5mm] leading-[1.25]">{props.note}</div> : null}

      <div className="mt-auto">
        {props.signatureLine ? (
          <div className="mx-auto mb-[1.5mm] mt-[6mm] h-[2.8mm] w-[44mm] border-b border-black" />
        ) : null}
        {props.tandaTangan}
      </div>
    </div>
  );
}

function buildDalamKotaRows(props: VisumPrintProps): VisumRow[] {
  const daftarTujuan = (props.daftarTujuanDalamKota ?? []).filter(Boolean);
  const tujuanList = daftarTujuan.length > 0 ? daftarTujuan : [props.lokasiTujuan];

  const rows: VisumRow[] = [
    {
      kiri: {},
      kanan: {
        nomor: roman(1),
        items: [
          { label: "Berangkat dari", value: props.lokasiAsal },
          { label: "(Tempat Kedudukan)" },
          { label: "Ke" },
          { label: "Pada Tanggal", value: props.tanggalMulai },
          { label: "Kepala" },
        ],
        tandaTangan: (
          <TandaTanganBlock
            jabatan={props.pejabatJabatan}
            nama={props.pejabatNama}
            nip={props.pejabatNip}
            compact
          />
        ),
        minHeight: "min-h-[37mm]",
      },
    },
  ];

  tujuanList.forEach((tujuan, index) => {
    const nextTujuan = tujuanList[index + 1] ?? props.lokasiAsal;
    const tanggalBerikutnya = index === tujuanList.length - 1 ? props.tanggalSelesai : props.tanggalMulai;

    rows.push({
      kiri: {
        nomor: roman(index + 2),
        items: [
          { label: "Tiba di", value: tujuan },
          { label: "Pada Tanggal", value: props.tanggalMulai },
          { label: "Kepala" },
        ],
        signatureLine: true,
      },
      kanan: {
        items: [
          { label: "Berangkat dari", value: tujuan },
          { label: "Ke" },
          { label: "Pada Tanggal", value: tanggalBerikutnya },
          { label: "Kepala" },
        ],
        signatureLine: true,
      },
    });
  });

  rows.push({
    kiri: {
      nomor: roman(tujuanList.length + 2),
      items: [
        { label: "Tiba di", value: props.lokasiAsal },
        { label: "(Tempat Kedudukan)" },
        { label: "Pada Tanggal", value: props.tanggalSelesai },
      ],
      tandaTangan: (
        <TandaTanganBlock
          jabatan={props.pejabatJabatan}
          nama={props.pejabatNama}
          nip={props.pejabatNip}
        />
      ),
      minHeight: "min-h-[32mm]",
    },
    kanan: {
      items: [{ label: "NIP." }],
      note: (
        <>
          <p>Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya</p>
          <p>dan semata-mata untuk kepentingan jabatan dalam waktu yang singkat-singkatnya.</p>
        </>
      ),
      tandaTangan: (
        <TandaTanganBlock
          jabatan={props.pejabatJabatan}
          nama={props.pejabatNama}
          nip={props.pejabatNip}
        />
      ),
      minHeight: "min-h-[32mm]",
    },
  });

  return rows;
}

function VisumBelakang(props: VisumPrintProps) {
  const adalahDalamKota = props.judul.toLowerCase().includes("dalam kota");

  const rows: VisumRow[] = adalahDalamKota
    ? buildDalamKotaRows(props)
    : [
        {
          kiri: {},
          kanan: {
            nomor: roman(1),
            items: [
              { label: "Berangkat dari", value: props.lokasiAsal },
              { label: "(Tempat Kedudukan)" },
              { label: "Ke", value: props.lokasiTujuan },
              { label: "Pada Tanggal", value: props.tanggalMulai },
              { label: "Kepala" },
            ],
            tandaTangan: (
              <TandaTanganBlock
                jabatan={props.pejabatJabatan}
                nama={props.pejabatNama}
                nip={props.pejabatNip}
                compact
              />
            ),
            minHeight: "min-h-[37mm]",
          },
        },
        {
          kiri: {
            nomor: roman(2),
            items: [
              { label: "Tiba di", value: props.lokasiTujuan },
              { label: "Pada Tanggal", value: props.tanggalMulai },
              { label: "Kepala" },
            ],
            signatureLine: true,
          },
          kanan: {
            items: [
              { label: "Berangkat dari", value: props.lokasiTujuan },
              { label: "Ke", value: props.lokasiAsal },
              { label: "Pada Tanggal", value: props.tanggalSelesai },
              { label: "Kepala" },
            ],
            signatureLine: true,
          },
        },
        {
          kiri: { nomor: roman(3), items: [{ label: "Tiba di" }, { label: "Pada Tanggal" }, { label: "Kepala" }], signatureLine: true },
          kanan: { items: [{ label: "Berangkat dari" }, { label: "Ke" }, { label: "Pada Tanggal" }, { label: "Kepala" }], signatureLine: true },
        },
        {
          kiri: { nomor: roman(4), items: [{ label: "Tiba di" }, { label: "Pada Tanggal" }, { label: "Kepala" }], signatureLine: true },
          kanan: { items: [{ label: "Berangkat dari" }, { label: "Ke" }, { label: "Pada Tanggal" }, { label: "Kepala" }], signatureLine: true },
        },
        {
          kiri: { nomor: roman(5), items: [{ label: "Tiba di" }, { label: "Pada Tanggal" }, { label: "Kepala" }], signatureLine: true },
          kanan: { items: [{ label: "Berangkat dari" }, { label: "Ke" }, { label: "Pada Tanggal" }, { label: "Kepala" }], signatureLine: true },
        },
        {
          kiri: {
            nomor: roman(6),
            items: [
              { label: "Tiba di", value: props.lokasiAsal },
              { label: "(Tempat Kedudukan)" },
              { label: "Pada Tanggal", value: props.tanggalSelesai },
            ],
            tandaTangan: (
              <TandaTanganBlock
                jabatan={props.pejabatJabatan}
                nama={props.pejabatNama}
                nip={props.pejabatNip}
              />
            ),
            minHeight: "min-h-[32mm]",
          },
          kanan: {
            note: (
              <>
                <p>Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya</p>
                <p>dan semata-mata untuk kepentingan jabatan dalam waktu yang singkat-singkatnya.</p>
              </>
            ),
            tandaTangan: (
              <TandaTanganBlock
                jabatan={props.pejabatJabatan}
                nama={props.pejabatNama}
                nip={props.pejabatNip}
              />
            ),
            minHeight: "min-h-[32mm]",
          },
        },
      ];

  return (
    <article className="print-page mx-auto min-h-[297mm] w-[210mm] bg-white px-[8mm] pb-[10mm] pt-[18mm] text-black [font-family:Arial,Helvetica,sans-serif]">
      <div className="mb-[2.5mm] grid grid-cols-[1fr_auto_1fr] text-[7.57pt] leading-[1.1]">
        <div className="text-center">Lampiran SPPD Tanggal : {props.tanggalSt}</div>
        <div className="text-center">Nomor : {props.nomorSt}</div>
        <div />
      </div>

      <table className="w-full border-collapse text-[7.57pt] leading-[1.08]">
        <tbody>
          {rows.map((row, index) => (
            <tr key={`row-${index}`}>
              <td className="w-1/2 border border-[#555] align-top">
                <VisumCell
                  nomor={row.kiri.nomor}
                  items={row.kiri.items}
                  note={row.kiri.note}
                  signatureLine={row.kiri.signatureLine}
                  tandaTangan={row.kiri.tandaTangan}
                  minHeight={row.kiri.minHeight}
                />
              </td>
              <td className="w-1/2 border border-[#555] align-top">
                <VisumCell
                  nomor={row.kanan.nomor}
                  items={row.kanan.items}
                  note={row.kanan.note}
                  signatureLine={row.kanan.signatureLine}
                  tandaTangan={row.kanan.tandaTangan}
                  minHeight={row.kanan.minHeight}
                />
              </td>
            </tr>
          ))}

          <tr>
            <td className="border border-[#555] px-[3.5mm] py-[1mm] align-top">
              <div className="grid grid-cols-[8mm_25mm_4mm_1fr]">
                <div>{roman(rows.length + 1)}</div>
                <div>Catatan Lain-lain</div>
                <div>:</div>
                <div>{renderParagraf(props.catatan, "leading-[1.15]")[0] ?? ""}</div>
              </div>
            </td>
            <td className="border border-[#555] px-[3.5mm] py-[1mm] align-top" />
          </tr>

          <tr>
            <td className="border border-[#555] px-[3.5mm] py-[1mm] align-top" colSpan={2}>
              <div className="grid grid-cols-[8mm_1fr] text-[5.4pt] leading-[1.12]">
                <div>{roman(rows.length + 2)}</div>
                <div>
                  <p className="font-bold uppercase">Perhatian :</p>
                  <div className="italic">
                    {renderParagraf(
                      props.pengantar || props.penutup,
                      "mt-[0.4mm]",
                    )}
                    {renderParagraf(
                      "PPK yang menerbitkan SPPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan keuangan negara apabila menderita rugi akibat kesalahan, kelalaian, dan kealpaannya.",
                      "mt-[0.4mm]",
                    )}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}

function VisumDepan(props: VisumPrintProps) {
  const mainPelaksana = props.pelaksana[0];
  const pengikut = props.pelaksana.slice(1);
  const alatAngkutan =
    props.jenisPerjalanan === "Dalam_Kota"
      ? "Transportasi Darat"
      : props.tujuanProvinsi?.toLowerCase().includes("riau")
      ? "Transportasi Darat"
      : "Transportasi Udara";

  return (
    <article 
      className="print-page mx-auto min-h-[297mm] w-[210mm] bg-white px-[12mm] pb-[10mm] pt-[10mm] text-black [font-family:Arial,Helvetica,sans-serif] flex flex-col justify-between" 
      style={{ breakAfter: "page", pageBreakAfter: "always" }}
    >
      <div>
        {/* KOP SURAT */}
        <header className="flex items-center gap-[4mm] border-b-2 border-black pb-[2mm] text-left">
          <img src="/logo-kpu.png" alt="Logo KPU" className="h-[20mm] w-[20mm] object-contain" />
          <div className="flex-1 text-center">
            <h1 className="text-[14pt] font-bold leading-tight uppercase font-sans">Komisi Pemilihan Umum</h1>
            <h2 className="text-[14pt] font-bold leading-tight uppercase font-sans">Kota Dumai</h2>
            <p className="text-[8.5pt] font-normal font-sans mt-[1mm] leading-tight">
              Alamat : Jl. Tuanku Tambusai No. Kel. Bagan Besar Dumai
            </p>
            <p className="text-[8.5pt] font-normal font-sans leading-tight">
              Telp. (0765) 810322, 810300 e-mail:kpukotadumai@yahoo.co.id
            </p>
          </div>
        </header>

        {/* METADATA ATAS KANAN */}
        <div className="mt-[3mm] grid grid-cols-[3fr_2fr] text-[9.5pt] leading-tight text-left">
          <div>
            <div>Kementerian Negara/ Lembaga :</div>
            <div className="font-bold mt-[0.5mm] uppercase">KOMISI PEMILIHAN UMUM</div>
          </div>
          <div className="space-y-[1px]">
            <div className="grid grid-cols-[25mm_3mm_1fr]">
              <div>Lembar Ke</div>
              <div>:</div>
              <div></div>
            </div>
            <div className="grid grid-cols-[25mm_3mm_1fr]">
              <div>Kode No.</div>
              <div>:</div>
              <div></div>
            </div>
            <div className="grid grid-cols-[25mm_3mm_1fr]">
              <div>Nomor</div>
              <div>:</div>
              <div className="font-semibold">{props.nomorSt}</div>
            </div>
          </div>
        </div>

        {/* JUDUL */}
        <div className="text-center mt-[4mm] mb-[4mm]">
          <p className="text-[11.5pt] font-bold underline uppercase tracking-wide">
            Surat Perjalanan Dinas;
          </p>
        </div>

        {/* TABLE UTAMA */}
        <table className="w-full border-collapse border border-[#555] text-[9.5pt] leading-normal text-left table-fixed">
          <colgroup>
            <col style={{ width: "10mm" }} />
            <col style={{ width: "10mm" }} />
            <col style={{ width: "75mm" }} />
            <col style={{ width: "45.5mm" }} />
            <col style={{ width: "45.5mm" }} />
          </colgroup>
          <tbody>
            {/* ROW 1 */}
            <tr className="align-top divide-x divide-[#555] border-b border-[#555]">
              <td className="p-[2mm] text-center">1.</td>
              <td className="p-[2mm]" colSpan={2}>Pejabat Pembuat Komitmen KPU Kota Dumai</td>
              <td className="p-[2mm] uppercase font-semibold" colSpan={2}>{props.pejabatNama}</td>
            </tr>

            {/* ROW 2 */}
            <tr className="align-top divide-x divide-[#555] border-b border-[#555]">
              <td className="p-[2mm] text-center">2.</td>
              <td className="p-[2mm]" colSpan={2}>
                Nama / NIP Pegawai yang melaksanakan perjalanan dinas
              </td>
              <td className="p-[2mm] uppercase" colSpan={2}>
                {mainPelaksana ? (
                  <>
                    <div className="font-bold">{mainPelaksana.nama}</div>
                    {mainPelaksana.nip_nik && (
                      <div className="text-[9pt] font-semibold mt-[0.5mm]">
                        NIP. {mainPelaksana.nip_nik}
                      </div>
                    )}
                  </>
                ) : (
                  "-"
                )}
              </td>
            </tr>

            {/* ROW 3 */}
            <tr className="align-top divide-x divide-[#555] border-b border-[#555]">
              <td className="p-[2mm] text-center">3.</td>
              <td className="p-[0.5mm]" colSpan={2}>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm]">
                  <div>a.</div>
                  <div>Pangkat dan golongan ruang gaji</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>b.</div>
                  <div>Jabatan / Instansi</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>c.</div>
                  <div>Tingkat Biaya Perjalanan Dinas</div>
                </div>
              </td>
              <td className="p-[0.5mm]" colSpan={2}>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm]">
                  <div>a.</div>
                  <div>{mainPelaksana?.pangkat_golongan || "-"}</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>b.</div>
                  <div>{mainPelaksana?.jabatan || "-"}</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>c.</div>
                  <div>{mainPelaksana ? tentukanTingkatBiaya(mainPelaksana.pangkat_golongan) : "-"}</div>
                </div>
              </td>
            </tr>

            {/* ROW 4 */}
            <tr className="align-top divide-x divide-[#555] border-b border-[#555]">
              <td className="p-[2mm] text-center">4.</td>
              <td className="p-[2mm]" colSpan={2}>Maksud Perjalanan Dinas</td>
              <td className="p-[2mm] leading-relaxed" colSpan={2}>{props.maksudPerjalanan || props.judul}</td>
            </tr>

            {/* ROW 5 */}
            <tr className="align-top divide-x divide-[#555] border-b border-[#555]">
              <td className="p-[2mm] text-center">5.</td>
              <td className="p-[2mm]" colSpan={2}>Alat angkutan yang dipergunakan</td>
              <td className="p-[2mm]" colSpan={2}>{alatAngkutan}</td>
            </tr>

            {/* ROW 6 */}
            <tr className="align-top divide-x divide-[#555] border-b border-[#555]">
              <td className="p-[2mm] text-center">6.</td>
              <td className="p-[0.5mm]" colSpan={2}>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm]">
                  <div>a.</div>
                  <div>Tempat berangkat</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>b.</div>
                  <div>Tempat Tujuan</div>
                </div>
              </td>
              <td className="p-[0.5mm]" colSpan={2}>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm]">
                  <div>a.</div>
                  <div>{props.lokasiAsal}</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>b.</div>
                  <div>{props.lokasiTujuan}</div>
                </div>
              </td>
            </tr>

            {/* ROW 7 */}
            <tr className="align-top divide-x divide-[#555] border-b border-[#555]">
              <td className="p-[2mm] text-center">7.</td>
              <td className="p-[0.5mm]" colSpan={2}>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm]">
                  <div>a.</div>
                  <div>Lamanya Perjalanan Dinas</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>b.</div>
                  <div>Tanggal berangkat</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>c.</div>
                  <div>Tanggal harus kembali/tiba di tempat baru *)</div>
                </div>
              </td>
              <td className="p-[0.5mm]" colSpan={2}>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm]">
                  <div>a.</div>
                  <div>{terbilangHari(props.jumlahHari)}</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>b.</div>
                  <div>{props.tanggalMulai}</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>c.</div>
                  <div>{props.tanggalSelesai}</div>
                </div>
              </td>
            </tr>

            {/* ROW 8: Pengikut (Flat Rows) */}
            <tr className="align-top divide-x divide-[#555] border-b border-[#555] text-center font-bold">
              <td className="p-[2mm]">8.</td>
              <td className="p-[2mm]">No.</td>
              <td className="p-[2mm] text-left">Pengikut : Nama</td>
              <td className="p-[2mm]">Tanggal Lahir</td>
              <td className="p-[2mm]">Keterangan</td>
            </tr>
            {pengikut.length > 0 ? (
              pengikut.map((p, idx) => (
                <tr key={idx} className="align-top divide-x divide-[#555] border-b border-[#555] uppercase">
                  <td className="p-[2mm]">&nbsp;</td>
                  <td className="p-[2mm] text-center">{idx + 1}.</td>
                  <td className="p-[2mm] font-semibold text-left">{p.nama}</td>
                  <td className="p-[2mm] text-center">-</td>
                  <td className="p-[2mm] text-center">-</td>
                </tr>
              ))
            ) : (
              <>
                <tr className="align-top divide-x divide-[#555] border-b border-[#555]">
                  <td className="p-[2mm]">&nbsp;</td>
                  <td className="p-[2mm] text-center">1.</td>
                  <td className="p-[2mm]">&nbsp;</td>
                  <td className="p-[2mm]">&nbsp;</td>
                  <td className="p-[2mm]">&nbsp;</td>
                </tr>
                <tr className="align-top divide-x divide-[#555] border-b border-[#555]">
                  <td className="p-[2mm]">&nbsp;</td>
                  <td className="p-[2mm] text-center">2.</td>
                  <td className="p-[2mm]">&nbsp;</td>
                  <td className="p-[2mm]">&nbsp;</td>
                  <td className="p-[2mm]">&nbsp;</td>
                </tr>
                <tr className="align-top divide-x divide-[#555] border-b border-[#555]">
                  <td className="p-[2mm]">&nbsp;</td>
                  <td className="p-[2mm] text-center">3.</td>
                  <td className="p-[2mm]">&nbsp;</td>
                  <td className="p-[2mm]">&nbsp;</td>
                  <td className="p-[2mm]">&nbsp;</td>
                </tr>
              </>
            )}

            {/* ROW 9 */}
            <tr className="align-top divide-x divide-[#555] border-b border-[#555]">
              <td className="p-[2mm] text-center">9.</td>
              <td className="p-[0.5mm]" colSpan={2}>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm]">
                  <div>a.</div>
                  <div>Instansi</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>b.</div>
                  <div>Mata Anggaran</div>
                </div>
              </td>
              <td className="p-[0.5mm]" colSpan={2}>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm]">
                  <div>a.</div>
                  <div className="uppercase">KPU Kota Dumai</div>
                </div>
                <div className="grid grid-cols-[5mm_1fr] p-[1.5mm] border-t border-[#555]">
                  <div>b.</div>
                  <div>{props.mataAnggaran || "524111"}</div>
                </div>
              </td>
            </tr>

            {/* ROW 10 */}
            <tr className="align-top divide-x divide-[#555]">
              <td className="p-[2mm] text-center">10.</td>
              <td className="p-[2mm]" colSpan={2}>Keterangan lain-lain</td>
              <td className="p-[2mm]" colSpan={2}>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        {/* BOTTOM */}
        <div className="mt-[2mm] text-[8.5pt] italic text-left">
          *) Coret yang tidak perlu
        </div>
      </div>

      <footer className="mt-[4mm] grid grid-cols-[1fr_75mm] text-[10pt] text-left">
        <div />
        <div className="leading-[1.2]">
          <div className="grid grid-cols-[30mm_3mm_1fr]">
            <div>Dikeluarkan di</div>
            <div>:</div>
            <div>Dumai</div>
          </div>
          <div className="grid grid-cols-[30mm_3mm_1fr] mt-[0.5mm]">
            <div>Pada Tanggal</div>
            <div>:</div>
            <div>{props.tanggalSt}</div>
          </div>
          <div className="mt-[2mm] font-bold">
            <p>Pejabat Pembuat Komitmen,</p>
            <div className="h-[18mm]" />
            <p className="underline uppercase">{props.pejabatNama}</p>
            <p className="font-normal">NIP. {props.pejabatNip}</p>
          </div>
        </div>
      </footer>
    </article>
  );
}

export function VisumPrint(props: VisumPrintProps) {
  return (
    <>
      <VisumDepan {...props} />
      <VisumBelakang {...props} />
    </>
  );
}
