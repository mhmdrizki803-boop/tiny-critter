# cutest-picture-01

This entry is a program that writes one picture. `main.ts` copies the repository's
`entry.png` to `/output/entry.png`, then verifies what it wrote: the PNG or JPEG
magic number, the header's pixel width and height, and the byte size.

The picture must be at most 1 MiB (1048576 bytes) and at most 1024x1024 pixels.
If it is not a PNG or JPEG, or a side is too large, the program exits 1.

## Run locally

    mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

Node 22, standard library only, no dependencies. Outside the grader's container
`MAKEFUN_OUTPUT_DIR` stands in for `/output`.
