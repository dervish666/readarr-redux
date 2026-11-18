using System;
using FizzWare.NBuilder;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Books.Commands;
using NzbDrone.Core.Download;
using NzbDrone.Core.ImportLists;
using NzbDrone.Core.Indexers;
using NzbDrone.Core.IndexerSearch;
using NzbDrone.Core.Messaging.Commands;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Core.Update.Commands;

namespace NzbDrone.Core.Test.Messaging.Commands
{
    [TestFixture]
    public class CommandQueueFixture : CoreTest<CommandQueue>
    {
        private CommandModel QueueCommand(Command body, int id, CommandPriority priority = CommandPriority.Normal)
        {
            var model = new CommandModel
            {
                Id = id,
                Name = body.Name,
                Body = body,
                Priority = priority,
                Status = CommandStatus.Queued,
                QueuedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddSeconds(id)
            };
            Subject.Add(model);
            return model;
        }

        [Test]
        public void should_allow_download_processing_when_author_searches_are_queued()
        {
            var first = QueueCommand(new AuthorSearchCommand { AuthorId = 1 }, 1, CommandPriority.High);
            var second = QueueCommand(new AuthorSearchCommand { AuthorId = 2 }, 2, CommandPriority.High);
            var third = QueueCommand(new AuthorSearchCommand { AuthorId = 3 }, 3, CommandPriority.High);
            var download = QueueCommand(new ProcessMonitoredDownloadsCommand(), 4);
            var refresh = QueueCommand(new RefreshMonitoredDownloadsCommand(), 5);

            Subject.TryGet(out var worker1).Should().BeTrue();
            Subject.TryGet(out var worker2).Should().BeTrue();
            Subject.TryGet(out var worker3).Should().BeTrue();

            worker1.Should().BeSameAs(first);
            worker2.Should().BeSameAs(download);
            worker3.Should().BeSameAs(refresh);
            second.Status.Should().Be(CommandStatus.Queued);
            third.Status.Should().Be(CommandStatus.Queued);
        }

        [TestCase(CommandStatus.Completed)]
        [TestCase(CommandStatus.Failed)]
        [TestCase(CommandStatus.Aborted)]
        [TestCase(CommandStatus.Cancelled)]
        public void should_start_the_next_author_search_after_the_running_search_finishes(CommandStatus status)
        {
            var first = QueueCommand(new AuthorSearchCommand { AuthorId = 1 }, 1);
            var second = QueueCommand(new AuthorSearchCommand { AuthorId = 2 }, 2);
            Subject.TryGet(out _).Should().BeTrue();
            Subject.TryGet(out _).Should().BeFalse();

            first.Status = status;

            Subject.TryGet(out var command).Should().BeTrue();
            command.Should().BeSameAs(second);
        }

        [Test]
        public void should_allow_an_author_search_alongside_disk_access_work()
        {
            GivenStartedDiskCommand();
            var search = QueueCommand(new AuthorSearchCommand { AuthorId = 1 }, 1);

            Subject.TryGet(out var command).Should().BeTrue();
            command.Should().BeSameAs(search);
        }

        private void GivenStartedDiskCommand()
        {
            var commandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "ProcessMonitoredDownloads")
                .With(c => c.Body = new ProcessMonitoredDownloadsCommand())
                .With(c => c.Status = CommandStatus.Started)
                .Build();

            Subject.Add(commandModel);
        }

        private void GivenLongRunningCommand()
        {
            var commandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "RssSync")
                .With(c => c.Body = new RssSyncCommand())
                .With(c => c.Status = CommandStatus.Started)
                .Build();

            Subject.Add(commandModel);
        }

        private void GivenStartedTypeExclusiveCommand()
        {
            var commandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "ImportListSync")
                .With(c => c.Body = new ImportListSyncCommand())
                .With(c => c.Status = CommandStatus.Started)
                .Build();

            Subject.Add(commandModel);
        }

        private void GivenStartedExclusiveCommand()
        {
            var commandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "ApplicationUpdate")
                .With(c => c.Body = new ApplicationUpdateCommand())
                .With(c => c.Status = CommandStatus.Started)
                .Build();

            Subject.Add(commandModel);
        }

        [Test]
        public void should_not_return_disk_access_command_if_another_running()
        {
            GivenStartedDiskCommand();

            var newCommandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "ProcessMonitoredDownloads")
                .With(c => c.Body = new ProcessMonitoredDownloadsCommand())
                .Build();

            Subject.Add(newCommandModel);

            Subject.TryGet(out var command);

            command.Should().BeNull();
        }

        [Test]
        public void should_not_return_type_exclusive_command_if_another_running()
        {
            GivenStartedTypeExclusiveCommand();

            var newCommandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "ImportListSync")
                .With(c => c.Body = new ImportListSyncCommand())
                .Build();

            Subject.Add(newCommandModel);

            Subject.TryGet(out var command);

            command.Should().BeNull();
        }

        [Test]
        public void should_not_return_exclusive_command_if_long_running_command_running()
        {
            GivenLongRunningCommand();

            var newCommandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "ApplicationUpdate")
                .With(c => c.Body = new ApplicationUpdateCommand())
                .Build();

            Subject.Add(newCommandModel);

            Subject.TryGet(out var command);

            command.Should().BeNull();
        }

        [Test]
        public void should_not_return_type_exclusive_command_if_another_and_disk_access_command_running()
        {
            GivenStartedTypeExclusiveCommand();
            GivenStartedDiskCommand();

            var newCommandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "ImportListSync")
                .With(c => c.Body = new ImportListSyncCommand())
                .Build();

            Subject.Add(newCommandModel);

            Subject.TryGet(out var command);

            command.Should().BeNull();
        }

        [Test]
        public void should_return_type_exclusive_command_if_another_not_running()
        {
            GivenStartedDiskCommand();

            var newCommandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "ImportListSync")
                .With(c => c.Body = new ImportListSyncCommand())
                .Build();

            Subject.Add(newCommandModel);

            Subject.TryGet(out var command);

            command.Should().NotBeNull();
            command.Status.Should().Be(CommandStatus.Started);
        }

        [Test]
        public void should_return_regular_command_if_type_exclusive_command_running()
        {
            GivenStartedTypeExclusiveCommand();

            var newCommandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "RefreshAuthor")
                .With(c => c.Body = new RefreshAuthorCommand())
                .Build();

            Subject.Add(newCommandModel);

            Subject.TryGet(out var command);

            command.Should().NotBeNull();
            command.Status.Should().Be(CommandStatus.Started);
        }

        [Test]
        public void should_not_return_exclusive_command_if_any_running()
        {
            GivenStartedDiskCommand();

            var newCommandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "ApplicationUpdate")
                .With(c => c.Body = new ApplicationUpdateCommand())
                .Build();

            Subject.Add(newCommandModel);

            Subject.TryGet(out var command);

            command.Should().BeNull();
        }

        [Test]
        public void should_not_return_any_command_if_exclusive_running()
        {
            GivenStartedExclusiveCommand();

            var newCommandModel = Builder<CommandModel>
                .CreateNew()
                .With(c => c.Name = "RefreshAuthor")
                .With(c => c.Body = new RefreshAuthorCommand())
                .Build();

            Subject.Add(newCommandModel);

            Subject.TryGet(out var command);

            command.Should().BeNull();
        }

        [Test]
        public void should_return_null_if_nothing_queued()
        {
            GivenStartedDiskCommand();

            Subject.TryGet(out var command);

            command.Should().BeNull();
        }
    }
}
