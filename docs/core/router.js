const routes = {

    basic: "basic",
    friends: "friends",
    messages: "messages",
    notifications: "notifications",
    settings: "settings",
    debug: "debug"

};

export async function loadView(name) {

    const folder = routes[name];

    if (!folder) {
        console.error("View not found:", name);
        return;
    }

    const htmlPath = `./views/${folder}/${folder}.html`;
    const jsPath = `../views/${folder}/${folder}.js`;

    /* load HTML */

    const res = await fetch(htmlPath);
    const html = await res.text();

    document.getElementById("main-content").innerHTML = html;

    /* load JS if exists */

    try {

        const module = await import(jsPath);

        const initFunction = `init${capitalize(folder)}`;

        if (module[initFunction]) {
            module[initFunction]();
        }

    } catch {

        /* view has no JS */

    }

}

/* helper */

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}