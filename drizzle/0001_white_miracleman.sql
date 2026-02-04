CREATE TABLE `calendar_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`date` date NOT NULL,
	`amount` decimal(10,2),
	`type` enum('income','expense','reminder') NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` date NOT NULL,
	`uber` decimal(10,2) NOT NULL DEFAULT '0.00',
	`bolt` decimal(10,2) NOT NULL DEFAULT '0.00',
	`freenow` decimal(10,2) NOT NULL DEFAULT '0.00',
	`horizoncars` decimal(10,2) NOT NULL DEFAULT '0.00',
	`other` decimal(10,2) NOT NULL DEFAULT '0.00',
	`expenses` decimal(10,2) NOT NULL DEFAULT '0.00',
	`balance` decimal(10,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `imported_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` date NOT NULL,
	`description` text,
	`amount` decimal(10,2) NOT NULL,
	`category` varchar(100),
	`source` varchar(100),
	`verified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `imported_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recurring_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`dayOfMonth` int NOT NULL,
	`category` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recurring_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `todo_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`text` text NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `todo_items_id` PRIMARY KEY(`id`)
);
