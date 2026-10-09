using System;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NzbDrone.Core.Qualities
{
    // Reads a quality given as {id, name} (the UI and the API docs), as its id (how the database stores it, so
    // what a script reading BookFiles or History finds) or as its name, and writes {id, name}. The database
    // keeps writing the id: a converter in the serializer's options outranks this one.
    public class QualityConverter : JsonConverter<Quality>
    {
        public override Quality Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            switch (reader.TokenType)
            {
                case JsonTokenType.Number:
                    if (reader.TryGetInt32(out var id))
                    {
                        return FindById(id) ?? throw new JsonException($"{id} is not a known quality id");
                    }

                    throw new JsonException("A quality id must be a whole number");

                case JsonTokenType.String:
                    var value = reader.GetString();

                    if (int.TryParse(value, out var stringId))
                    {
                        return FindById(stringId) ?? throw new JsonException($"{stringId} is not a known quality id");
                    }

                    return FindByName(value) ?? throw new JsonException($"'{value}' is not a known quality");

                case JsonTokenType.StartObject:
                    return ReadObject(ref reader);

                default:
                    throw new JsonException($"A quality must be an object, an id or a name, not {reader.TokenType}");
            }
        }

        public override void Write(Utf8JsonWriter writer, Quality value, JsonSerializerOptions options)
        {
            writer.WriteStartObject();
            writer.WriteNumber(options.PropertyNamingPolicy?.ConvertName(nameof(Quality.Id)) ?? nameof(Quality.Id), value.Id);

            if (value.Name != null)
            {
                writer.WriteString(options.PropertyNamingPolicy?.ConvertName(nameof(Quality.Name)) ?? nameof(Quality.Name), value.Name);
            }

            writer.WriteEndObject();
        }

        private static Quality ReadObject(ref Utf8JsonReader reader)
        {
            int? id = null;
            string name = null;

            while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
            {
                var property = reader.GetString();
                reader.Read();

                if (property.Equals(nameof(Quality.Id), StringComparison.OrdinalIgnoreCase) && reader.TokenType == JsonTokenType.Number && reader.TryGetInt32(out var objectId))
                {
                    id = objectId;
                }
                else if (property.Equals(nameof(Quality.Name), StringComparison.OrdinalIgnoreCase) && reader.TokenType == JsonTokenType.String)
                {
                    name = reader.GetString();
                }
                else
                {
                    reader.Skip();
                }
            }

            var known = id.HasValue ? FindById(id.Value) : FindByName(name);

            // An object with an id Readarr doesn't know came through as-is before this converter, so it still does
            return known ?? new Quality { Id = id ?? 0, Name = name };
        }

        private static Quality FindById(int id)
        {
            return Quality.All.SingleOrDefault(q => q.Id == id);
        }

        private static Quality FindByName(string name)
        {
            return name == null ? null : Quality.All.SingleOrDefault(q => q.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
        }
    }
}
