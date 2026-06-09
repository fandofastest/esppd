"use client";

import { useMemo, useState } from "react";

import { LpjInstantUploadField } from "@/components/forms/LpjInstantUploadField";
import type { JenisPerjalanan, StatusHotel } from "@/models";

interface LpjAkomodasiFieldsProps {
  sppdId: string;
  pegawaiId: string;
  jenisPerjalanan: JenisPerjalanan;
  initialStatusHotel: StatusHotel;
  initialHotelRiil: number;
  initialAlamatMenginapTanpaHotel: string;
  existingBuktiHotelCount: number;
  existingFotoKtpCount: number;
  buktiHotelFiles: Array<{
    value: string;
    previewUrl?: string;
  }>;
  fotoKtpFiles: Array<{
    value: string;
    previewUrl?: string;
  }>;
}

export function LpjAkomodasiFields({
  sppdId,
  pegawaiId,
  jenisPerjalanan,
  initialStatusHotel,
  initialHotelRiil,
  initialAlamatMenginapTanpaHotel,
  existingBuktiHotelCount,
  existingFotoKtpCount,
  buktiHotelFiles,
  fotoKtpFiles,
}: LpjAkomodasiFieldsProps) {
  const defaultStatusHotel =
    jenisPerjalanan === "Dalam_Kota"
      ? "Dalam_Kota_Tanpa_Hotel"
      : initialStatusHotel === "Tanpa_Hotel_30_Persen"
        ? "Tanpa_Hotel_30_Persen"
        : "Menggunakan_Hotel";

  const [statusHotel, setStatusHotel] = useState<StatusHotel>(defaultStatusHotel);
  const [hotelInput, setHotelInput] = useState(String(initialHotelRiil ?? 0));

  const memakaiHotel = statusHotel === "Menggunakan_Hotel";
  const tanpaHotel = statusHotel === "Tanpa_Hotel_30_Persen";
  const butuhBuktiHotel = memakaiHotel && existingBuktiHotelCount === 0;
  const butuhFotoKtp = tanpaHotel && existingFotoKtpCount === 0;

  const labelHotel = useMemo(() => {
    if (jenisPerjalanan === "Dalam_Kota") {
      return "Total Hotel Riil";
    }

    return memakaiHotel ? "Total Hotel Riil" : "Input Tunjangan 30%";
  }, [jenisPerjalanan, memakaiHotel]);

  return (
    <>
      {jenisPerjalanan === "Dalam_Kota" ? (
        <>
          <input type="hidden" name="status_hotel" value="Dalam_Kota_Tanpa_Hotel" />
          <input type="hidden" name="hotel_riil_input" value="0" />
          <input type="hidden" name="alamat_menginap_tanpa_hotel" value="" />
          <div className="rounded-[16px] border border-[#dfe4ee] bg-[#f7f8fc] p-4">
            <p className="font-semibold text-[#252c38]">Akomodasi tidak diperlukan</p>
            <p className="mt-2 text-sm text-[#7d8598]">
              Untuk perjalanan dinas dalam kota, hotel tidak perlu diinputkan pada LPJ.
            </p>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="label">Status Akomodasi</label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="rounded-[16px] border border-[#f0c9c5] bg-[#fff7f6] p-4">
                <input
                  className="mr-2"
                  type="radio"
                  name="status_hotel"
                  value="Menggunakan_Hotel"
                  checked={memakaiHotel}
                  onChange={() => setStatusHotel("Menggunakan_Hotel")}
                />
                <span className="font-semibold text-[#252c38]">Menggunakan Hotel</span>
                <p className="mt-2 text-sm text-[#7d8598]">
                  Penggantian biaya berdasarkan bukti hotel riil.
                </p>
              </label>
              <label className="rounded-[16px] border border-[#dfe4ee] p-4">
                <input
                  className="mr-2"
                  type="radio"
                  name="status_hotel"
                  value="Tanpa_Hotel_30_Persen"
                  checked={tanpaHotel}
                  onChange={() => setStatusHotel("Tanpa_Hotel_30_Persen")}
                />
                <span className="font-semibold text-[#252c38]">Tanpa Hotel / 30%</span>
                <p className="mt-2 text-sm text-[#7d8598]">
                  Uang lumpsum untuk akomodasi tanpa hotel.
                </p>
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">{labelHotel}</label>
              <input
                className="input"
                type="number"
                min={0}
                name="hotel_riil_input"
                value={hotelInput}
                onChange={(event) => setHotelInput(event.target.value)}
              />
              <p className="mt-2 text-xs text-[#7d8598]">
                {memakaiHotel
                  ? "Jika memakai hotel, lampirkan bukti hotel sesuai nilai yang diinput."
                  : "Jika tanpa hotel / 30%, cukup isi tunjangan dan alamat menginap bila diperlukan."}
              </p>
            </div>
              <div>
                {memakaiHotel ? (
                  <div>
                    <label className="label">Upload Bukti Hotel</label>
                    <LpjInstantUploadField
                      sppdId={sppdId}
                      pegawaiId={pegawaiId}
                      field="bukti_hotel"
                      label="Bukti Hotel"
                      inputName="bukti_hotel_files"
                      accept=".pdf,image/*"
                      required={butuhBuktiHotel}
                      helpText="Tampil hanya saat memilih menggunakan hotel dan bisa lebih dari satu file."
                      emptyText="Belum ada bukti hotel."
                      uploadedFiles={buktiHotelFiles}
                      isComplete={buktiHotelFiles.length > 0}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="label">Upload Foto KTP</label>
                      <LpjInstantUploadField
                        sppdId={sppdId}
                        pegawaiId={pegawaiId}
                        field="foto_ktp"
                        label="Foto KTP"
                        inputName="foto_ktp_files"
                        accept=".pdf,image/*"
                        required={butuhFotoKtp}
                        helpText="Wajib saat memilih tanpa hotel / 30% dan bisa lebih dari satu file."
                        emptyText="Belum ada foto KTP."
                        uploadedFiles={fotoKtpFiles}
                        isComplete={fotoKtpFiles.length > 0}
                      />
                    </div>
                    <div>
                      <label className="label">Alamat Menginap Tanpa Hotel</label>
                      <input
                        className="input"
                        name="alamat_menginap_tanpa_hotel"
                        defaultValue={initialAlamatMenginapTanpaHotel}
                      />
                      <p className="mt-2 text-xs text-[#7d8598]">
                        Diisi bila diperlukan untuk keterangan akomodasi tanpa hotel.
                      </p>
                    </div>
                  </>
                )}
              </div>
          </div>
        </>
      )}
    </>
  );
}
