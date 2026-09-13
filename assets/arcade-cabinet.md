# Arcade cabinet skin

`arcade-cabinet-large.png` is the active production skin, edited with the built-in image-generation tool from the user-approved `arcade-cabinet.png` (retained as a reference). It enlarges the upper display and removes the separate sound toolbar while preserving the enamel body, projecting control deck and recessed lower hatch. Live controls and dynamic text are not baked into the image.

- Canvas: 887 × 1774 pixels; the machine retains a 1:2 aspect ratio at every stage.
- The outer CSS clip path traces the illustrated silhouette and excludes the generated image's backdrop. The PNG itself does not contain alpha transparency.
- Screen, size strip, action button and ticket use percentage-positioned HTML overlays and container-relative type sizes. Keep these aligned if replacing the artwork.
- The active screen overlay is at left 17.35%, top 16.45%, width 65.3%, height 25.5%. Its area is about 58% larger than the previous opening without extending the machine.
- Gameplay is silent: there is no sound control, audio initialization or playback code.
- The four product photographs remain the supplied originals, independent of the cabinet art.
- The small printed ticket never changes the cabinet height. Full coupon and purchase-access details live in an accessible native dialog.
- This asset is visual presentation, not proof of a backend draw or redeemable purchase entitlement.
