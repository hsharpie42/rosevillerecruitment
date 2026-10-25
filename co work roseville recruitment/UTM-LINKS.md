# UTM links for ads and posted links

Every ad, post or listing must use a tagged link so the tracker's **Channel** and
**Campaign** columns and GA4 can attribute each application. The landing pages
read the tags on load, keep them for the session, and send them with the form.

## Pattern

```
https://rosevillecaregroup.co.uk/<page>?utm_source=<source>&utm_medium=<medium>&utm_campaign=<home>-<role>&utm_content=<creative>
```

| Tag | Allowed values |
|---|---|
| `utm_source` | `facebook` `instagram` `indeed` `google` `gumtree` |
| `utm_medium` | `paid` `organic` |
| `utm_campaign` | `melksham-ca` `york-hc` `limetree-ca` `lodge-ca` |
| `utm_content` | the creative variant, e.g. `belonging`, `pay`, `flexible-hours`, `video1` |

Use lower case throughout and no spaces. Change only `utm_content` between
creatives in the same campaign so results roll up per home.

## Domain

Use `https://rosevillecaregroup.co.uk/...` only once the Netlify domain release
is complete and the pages load there. Until then use
`https://roseville-recruitment.netlify.app/...` with the same paths and tags.

## Ready-made links (replace `belonging` with the creative name)

### The Old Parsonage, Melksham — Care Assistant (`melksham-ca`)

| Channel | Link |
|---|---|
| Facebook paid | `https://rosevillecaregroup.co.uk/melksham?utm_source=facebook&utm_medium=paid&utm_campaign=melksham-ca&utm_content=belonging` |
| Instagram paid | `https://rosevillecaregroup.co.uk/melksham?utm_source=instagram&utm_medium=paid&utm_campaign=melksham-ca&utm_content=belonging` |
| Facebook organic post | `https://rosevillecaregroup.co.uk/melksham?utm_source=facebook&utm_medium=organic&utm_campaign=melksham-ca&utm_content=post` |
| Indeed listing | `https://rosevillecaregroup.co.uk/melksham?utm_source=indeed&utm_medium=organic&utm_campaign=melksham-ca&utm_content=listing` |
| Gumtree listing | `https://rosevillecaregroup.co.uk/melksham?utm_source=gumtree&utm_medium=organic&utm_campaign=melksham-ca&utm_content=listing` |
| Google ad | `https://rosevillecaregroup.co.uk/melksham?utm_source=google&utm_medium=paid&utm_campaign=melksham-ca&utm_content=search` |

### Able Carers, York — Home Carer (`york-hc`)

| Channel | Link |
|---|---|
| Facebook paid | `https://rosevillecaregroup.co.uk/york?utm_source=facebook&utm_medium=paid&utm_campaign=york-hc&utm_content=belonging` |
| Instagram paid | `https://rosevillecaregroup.co.uk/york?utm_source=instagram&utm_medium=paid&utm_campaign=york-hc&utm_content=belonging` |
| Facebook organic post | `https://rosevillecaregroup.co.uk/york?utm_source=facebook&utm_medium=organic&utm_campaign=york-hc&utm_content=post` |
| Indeed listing | `https://rosevillecaregroup.co.uk/york?utm_source=indeed&utm_medium=organic&utm_campaign=york-hc&utm_content=listing` |
| Gumtree listing | `https://rosevillecaregroup.co.uk/york?utm_source=gumtree&utm_medium=organic&utm_campaign=york-hc&utm_content=listing` |
| Google ad | `https://rosevillecaregroup.co.uk/york?utm_source=google&utm_medium=paid&utm_campaign=york-hc&utm_content=search` |

### Limetree House — Care Assistant (`limetree-ca`)

| Channel | Link |
|---|---|
| Facebook paid | `https://rosevillecaregroup.co.uk/limetreehouse?utm_source=facebook&utm_medium=paid&utm_campaign=limetree-ca&utm_content=belonging` |
| Instagram paid | `https://rosevillecaregroup.co.uk/limetreehouse?utm_source=instagram&utm_medium=paid&utm_campaign=limetree-ca&utm_content=belonging` |
| Facebook organic post | `https://rosevillecaregroup.co.uk/limetreehouse?utm_source=facebook&utm_medium=organic&utm_campaign=limetree-ca&utm_content=post` |
| Indeed listing | `https://rosevillecaregroup.co.uk/limetreehouse?utm_source=indeed&utm_medium=organic&utm_campaign=limetree-ca&utm_content=listing` |
| Gumtree listing | `https://rosevillecaregroup.co.uk/limetreehouse?utm_source=gumtree&utm_medium=organic&utm_campaign=limetree-ca&utm_content=listing` |
| Google ad | `https://rosevillecaregroup.co.uk/limetreehouse?utm_source=google&utm_medium=paid&utm_campaign=limetree-ca&utm_content=search` |

### The Lodge — Care Assistant (`lodge-ca`)

| Channel | Link |
|---|---|
| Facebook paid | `https://rosevillecaregroup.co.uk/lodge?utm_source=facebook&utm_medium=paid&utm_campaign=lodge-ca&utm_content=belonging` |
| Instagram paid | `https://rosevillecaregroup.co.uk/lodge?utm_source=instagram&utm_medium=paid&utm_campaign=lodge-ca&utm_content=belonging` |
| Facebook organic post | `https://rosevillecaregroup.co.uk/lodge?utm_source=facebook&utm_medium=organic&utm_campaign=lodge-ca&utm_content=post` |
| Indeed listing | `https://rosevillecaregroup.co.uk/lodge?utm_source=indeed&utm_medium=organic&utm_campaign=lodge-ca&utm_content=listing` |
| Gumtree listing | `https://rosevillecaregroup.co.uk/lodge?utm_source=gumtree&utm_medium=organic&utm_campaign=lodge-ca&utm_content=listing` |
| Google ad | `https://rosevillecaregroup.co.uk/lodge?utm_source=google&utm_medium=paid&utm_campaign=lodge-ca&utm_content=search` |

## Checking a link works

Open the tagged link, submit a test application, and confirm the new row on the
Main tracker shows the source in **Channel** and the campaign in **Campaign**.
Delete the test row afterwards. Untagged visits record the referrer's platform
(facebook, instagram, indeed, google) or `direct`.
