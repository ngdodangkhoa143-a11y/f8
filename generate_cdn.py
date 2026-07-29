import os
import hashlib
import lzma
import xml.etree.ElementTree as ET
from xml.dom import minidom
import shutil
import time

# Cấu hình
SOURCE_DIR = r"C:\Users\Administrator\Downloads\f8client\code\bin\five\release"
CDN_OUT = r"C:\Users\Administrator\Downloads\f8client\CDN_Server"
VERSION = "FINAL_RESTORE_3"
CHANNEL = "production"
CONTENT_NAME = "fivereborn"

def get_sha1(filepath):
    h = hashlib.sha1()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def get_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def get_sha1_bytes(data):
    return hashlib.sha1(data).hexdigest()

def get_sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()

def build_cdn():
    print(f"[+] Bắt đầu tạo CDN tại {CDN_OUT}...")
    if not os.path.exists(CDN_OUT):
        os.makedirs(CDN_OUT)

    root_xml = ET.Element("FileBuild")

    files_processed = 0

    for dirpath, _, filenames in os.walk(SOURCE_DIR):
        # Bỏ qua các thư mục không cần thiết
        rel_dir = os.path.relpath(dirpath, SOURCE_DIR)
        skip_dirs = ['data\\cache', 'data\\game-storage', 'logs', 'crashes']
        if any(sd in rel_dir for sd in skip_dirs):
            continue

        for file in filenames:
            if file.endswith(('.pdb', '.formaldev', '.lib', '.exp', '.lnk', '.log', '.lastbuildstate')):
                continue
            if file == 'F8.VisualElementsManifest.xml':
                continue

            full_path = os.path.join(dirpath, file)
            rel_path = os.path.relpath(full_path, SOURCE_DIR).replace('\\', '/')

            # Lấy size
            file_size = os.path.getsize(full_path)
            is_large = file_size > 50 * 1024 * 1024

            # Đọc file gốc
            with open(full_path, 'rb') as f:
                raw_data = f.read()

            size = len(raw_data)
            sha1 = hashlib.sha1(raw_data).hexdigest()
            sha256 = hashlib.sha256(raw_data).hexdigest()

            compressed_size = size
            compressed_data = None
            out_name = sha256

            if is_large:
                print(f"  [COMPRESS] {rel_path} ({file_size / 1024 / 1024:.1f}MB) - nén bằng xz...")
                xz_path = r"C:\Users\Administrator\Downloads\f8client\code\tools\ci\xz.exe"
                temp_xz = full_path + ".xz"
                if os.path.exists(temp_xz):
                    os.remove(temp_xz)
                import subprocess
                subprocess.run([xz_path, "-z", "-k", "-1", full_path], check=False)
                if os.path.exists(temp_xz):
                    compressed_size = os.path.getsize(temp_xz)
                    out_name = sha256 + ".xz"
                    with open(temp_xz, 'rb') as f:
                        compressed_data = f.read()
                    os.remove(temp_xz)
                else:
                    print(f"  [ERROR] Lỗi khi nén {rel_path}, giữ nguyên.")

            ET.SubElement(root_xml, "ContentFile",
                Name=rel_path,
                Size=str(size),
                CompressedSize=str(compressed_size),
                SHA1Hash=sha1,
                SHA256Hash=sha256)

            h1 = sha256[0:2]
            h2 = sha256[2:4]
            out_dir = os.path.join(CDN_OUT, h1, h2)
            os.makedirs(out_dir, exist_ok=True)

            out_file = os.path.join(out_dir, out_name)

            if not os.path.exists(out_file):
                with open(out_file, 'wb') as f_out:
                    if compressed_data:
                        f_out.write(compressed_data)
                    else:
                        f_out.write(raw_data)
                print(f"  -> Copy {rel_path} ({sha1} / {sha256})")
            else:
                pass

            files_processed += 1

    # Lưu XML manifest tạm
    xml_str = minidom.parseString(ET.tostring(root_xml)).toprettyxml(indent="  ")
    temp_xml_path = os.path.join(CDN_OUT, "manifest_temp.xml")
    with open(temp_xml_path, "w", encoding="utf-8") as f:
        f.write(xml_str)

    # Tính hash và lưu manifest (KHÔNG NÉN)
    manifest_sha1 = get_sha1(temp_xml_path)
    mh1 = manifest_sha1[0:2]
    mh2 = manifest_sha1[2:4]
    manifest_dir = os.path.join(CDN_OUT, mh1, mh2)
    os.makedirs(manifest_dir, exist_ok=True)
    manifest_raw_path = os.path.join(manifest_dir, manifest_sha1)
    shutil.copy(temp_xml_path, manifest_raw_path)
    os.remove(temp_xml_path)
    print(f"[+] Đã tạo manifest XML (chưa nén): {manifest_sha1}")

    # Tạo version pointer (heads)
    heads_dir = os.path.join(CDN_OUT, "heads", CONTENT_NAME)
    os.makedirs(heads_dir, exist_ok=True)
    with open(os.path.join(heads_dir, CHANNEL), "w", encoding="utf-8") as f:
        f.write(f"{manifest_sha1}\n")

    # Tạo F8.exe.xz cho bootstrap (để Launcher tự cập nhật)
    f8_exe_path = os.path.join(SOURCE_DIR, "F8.exe")
    if os.path.exists(f8_exe_path):
        bootstrap_dir = os.path.join(CDN_OUT, "content", CONTENT_NAME, CHANNEL)
        os.makedirs(bootstrap_dir, exist_ok=True)
        bootstrap_exe_xz = os.path.join(bootstrap_dir, "F8.exe.xz")
        with open(f8_exe_path, 'rb') as f_in:
            with lzma.open(bootstrap_exe_xz, 'wb', preset=9) as f_out:
                f_out.write(f_in.read())
        print(f"[+] Đã nén F8.exe bootstrap vào {bootstrap_exe_xz}")

    print(f"\n[+] Đã băm và nén xong {files_processed} files!")
    print(f"[+] Thư mục CDN_Server đã sẵn sàng để up lên Github Pages!")

if __name__ == "__main__":
    build_cdn()
