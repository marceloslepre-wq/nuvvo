/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pickup_locations')

    if (!col.fields.getByName('video_url')) {
      col.fields.add(new TextField({ name: 'video_url' }))
    }

    if (!col.fields.getByName('video_file')) {
      col.fields.add(
        new FileField({
          name: 'video_file',
          maxSelect: 1,
          maxSize: 104857600,
          mimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pickup_locations')

    if (col.fields.getByName('video_url')) {
      col.fields.removeByName('video_url')
    }
    if (col.fields.getByName('video_file')) {
      col.fields.removeByName('video_file')
    }

    app.save(col)
  },
)
