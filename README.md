# ScreenRight nodejs client library.

## Installation
```
npm i screenright-client
```

## Setup environments

### Diagram Id

```
export SCREENRIGHT_DIAGRAM_ID=xxxxxxx
```

### Deployment Token
```
export SCREENRIGHT_DEPLOYMENT_TOKEN=xxxxxxx
```

## Implementation

### with "Playwright"

```
import { capture, initializeScreenwright, finalize } from "screenright-client"

test("basic test", async ({ page }) => {

  await initializeScreenwright() // The diagram ID specified in the environment variable is used.
  // await initializeScreenwright(diagramId) <- The diagram ID specified in the argument is used.


  // With the key home, capture with the title "Home Screen".
  await capture(page, "home", "Home Screen")


  // Created with "setting" as the parent screen.
  await capture(
    page,
    "setting|projects",
    "Project list",
    "setting"
  )


  // Specify options.
  await capture(
    page,
    "home",
    "Home Screen",
    undefined,
    {
      waitMilliseconds: 200, // wait before capturing.
      clickLocatorSelector: `button:text("delete)`, // specify the element you want to click.
      annotationText: "Click here!", // specify the annotation.
      annotationDirection: "bottom", // Specifies the position of the annotation from the element.
      paddingPixel: 4, // Specifies the padding for the border surrounding the element.
      annotationTextColor: "red" | "blue" | "black" | "white" | "yellow" | "green"
      description: "write a description"
    }
  )

  await finalize()
})
```

