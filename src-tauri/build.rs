use std::{
    env, fs,
    path::{Path, PathBuf},
};

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let dest_path = dst.join(entry.file_name());
        if path.is_dir() {
            copy_dir_all(&path, &dest_path)?;
        } else {
            fs::copy(&path, &dest_path)?;
        }
    }
    Ok(())
}

fn main() {
    tauri_build::build();
    if env::var("PROFILE").as_deref() == Ok("debug") {
        let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
        let src_dir = manifest_dir.join("../public/sfz_sounds");
        let dest_dir = manifest_dir.join("target/debug/sfz_sounds");
        if src_dir.exists() {
            let _ = fs::remove_dir_all(&dest_dir);
            if let Err(e) = copy_dir_all(&src_dir, &dest_dir) {
                println!("cargo:warning=failed to copy sfz assets: {e}");
            }
        }
    }
}
