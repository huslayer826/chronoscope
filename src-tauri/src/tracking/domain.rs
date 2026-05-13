use once_cell::sync::Lazy;
use publicsuffix::{List, Psl};
use url::Url;

static PUBLIC_SUFFIX_LIST: Lazy<Option<List>> =
    Lazy::new(|| List::from_bytes(include_bytes!("public_suffix_list.dat")).ok());

pub fn extract_domain(url: &str) -> Option<String> {
    let parsed = Url::parse(url).ok()?;
    let host = parsed.host_str()?.trim_end_matches('.').to_ascii_lowercase();

    if host.is_empty() {
        return None;
    }

    let list = PUBLIC_SUFFIX_LIST.as_ref()?;
    let domain = list.domain(host.as_bytes())?;

    String::from_utf8(domain.as_bytes().to_vec()).ok()
}
