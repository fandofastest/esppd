"use client";

import { useState } from "react";
import { createPegawaiAction } from "@/actions/master.actions";
import { FormActionButton } from "./FormActionButton";

export function TambahPegawaiForm() {
  const [jenisPegawai, setJenisPegawai] = useState("PNS");
  const [nipNik, setNipNik] = useState("");
  const [pangkatGolongan, setPangkatGolongan] = useState("");

  const handleJenisPegawaiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setJenisPegawai(value);
    if (value === "Komisioner") {
      setNipNik("-");
      setPangkatGolongan("IV");
    } else {
      if (nipNik === "-") setNipNik("");
      if (pangkatGolongan === "IV") setPangkatGolongan("");
    }
  };

  return (
    <form action={createPegawaiAction} className="mt-6 space-y-4">
      <div>
        <label className="label">Nama</label>
        <input className="input" name="nama" required />
      </div>

      <div>
        <label className="label">NIP / NIK</label>
        <input
          className={`input ${jenisPegawai === "Komisioner" ? "bg-slate-100 cursor-not-allowed text-slate-500" : ""}`}
          name="nip_nik"
          value={nipNik}
          onChange={(e) => setNipNik(e.target.value)}
          readOnly={jenisPegawai === "Komisioner"}
          required={jenisPegawai !== "Komisioner"}
          placeholder={jenisPegawai === "Komisioner" ? "Tanpa NIP" : "contoh: 198801012010011001"}
        />
      </div>

      <div>
        <label className="label">Pangkat / Golongan</label>
        <input
          className={`input ${jenisPegawai === "Komisioner" ? "bg-slate-100 cursor-not-allowed text-slate-500" : ""}`}
          name="pangkat_golongan"
          value={pangkatGolongan}
          onChange={(e) => setPangkatGolongan(e.target.value)}
          readOnly={jenisPegawai === "Komisioner"}
          required
          placeholder={jenisPegawai === "Komisioner" ? "Golongan otomatis IV" : "contoh: Penata Tk.I (III/d)"}
        />
      </div>

      <div>
        <label className="label">Jabatan</label>
        <input className="input" name="jabatan" required placeholder="contoh: Anggota Komisioner" />
      </div>

      <div>
        <label className="label">Jenis Pegawai</label>
        <select
          className="input"
          name="jenis_pegawai"
          value={jenisPegawai}
          onChange={handleJenisPegawaiChange}
        >
          <option value="PNS">PNS</option>
          <option value="PPPK">PPPK</option>
          <option value="Komisioner">Komisioner</option>
        </select>
      </div>

      <FormActionButton
        className="btn-primary w-full"
        label="Simpan Pegawai"
        pendingLabel="Menyimpan..."
      />
    </form>
  );
}
