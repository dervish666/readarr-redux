using System.Collections.Generic;
using System.Linq;
using FluentValidation.Results;

namespace NzbDrone.Test.Common
{
    // Flattens validation failures into "PropertyName | ErrorCode | Severity | ErrorMessage" so
    // characterisation tests can pin every observable field of a failure in one assertion.
    public static class ValidationResultDescriber
    {
        public static List<string> Describe(this ValidationResult result)
        {
            return result.Errors.Describe();
        }

        public static List<string> Describe(this IEnumerable<ValidationFailure> failures)
        {
            return failures.Select(Describe).ToList();
        }

        public static string Describe(this ValidationFailure failure)
        {
            return $"{failure.PropertyName} | {failure.ErrorCode} | {failure.Severity} | {failure.ErrorMessage}";
        }
    }
}
